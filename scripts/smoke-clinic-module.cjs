#!/usr/bin/env node
/**
 * Smoke tests para o módulo de clínica após deploy.
 *
 * Fluxo coberto:
 * 1. Autenticação (login + 2FA via Supabase)
 * 2. Emissão de convite e revogação
 * 3. Emissão de aditivo econômico e revogação
 * 4. Criação de cobertura temporária, listagem, exportações (CSV/XLS/PDF) e cancelamento
 * 5. Exportações de overrides de template (CSV/XLS/PDF)
 *
 * Dependências externas:
 * - curl.exe disponível no PATH (PowerShell)
 * - Variáveis de ambiente:
 *    SMOKE_BASE_URL (ex.: https://onterapi.vercel.app/api/v1)
 *    SMOKE_EMAIL / SMOKE_PASSWORD
 *    Opcional: SMOKE_SUPER_ADMIN_ID
 *
 * Supabase service role e URL são lidos do arquivo .env local.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return acc;
      }
      const index = trimmed.indexOf('=');
      if (index === -1) {
        return acc;
      }
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      acc[key] = value;
      return acc;
    }, {});
}

function curlRequest({ method = 'GET', url, headers = {}, body, expectJson = true }) {
  if (!url) {
    throw new Error('curlRequest requer uma URL');
  }

  const args = ['-sS', '-X', method];
  const finalHeaders = {
    Accept: expectJson ? 'application/json' : '*/*',
    ...headers,
  };

  for (const [headerKey, headerValue] of Object.entries(finalHeaders)) {
    args.push('-H', `${headerKey}: ${headerValue}`);
  }

  let input;
  if (body !== undefined) {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    input = payload;
    args.push('-H', 'Content-Type: application/json');
    args.push('--data-binary', '@-');
  }

  args.push(url);
  args.push('-w', 'HTTPSTATUS:%{http_code}');

  const result = spawnSync('curl.exe', args, { encoding: 'binary', input });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`curl retornou status ${result.status}: ${result.stderr || ''}`);
  }

  const stdout = result.stdout || '';
  const marker = 'HTTPSTATUS:';
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error('Não foi possível extrair o status HTTP da resposta do curl');
  }

  const bodyPortion = stdout.slice(0, markerIndex);
  const statusText = stdout.slice(markerIndex + marker.length).trim();
  const statusCode = Number.parseInt(statusText, 10);

  const rawBuffer = Buffer.from(bodyPortion, 'binary');
  let data = null;
  if (expectJson) {
    const trimmed = rawBuffer.toString('utf8').trim();
    if (trimmed) {
      try {
        data = JSON.parse(trimmed);
      } catch (error) {
        throw new Error(
          `Falha ao converter JSON (${error.message}). Trecho: ${trimmed.slice(0, 200)}`
        );
      }
    }
  }

  return { statusCode, data, rawBody: rawBuffer };
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  Atomics.wait(view, 0, 0, ms);
}

function loadConfig() {
  const envPath = path.resolve(process.cwd(), '.env');
  const env = parseEnvFile(envPath);

  const config = {
    baseUrl:
      process.env.SMOKE_BASE_URL ||
      env.SMOKE_BASE_URL ||
      'https://onterapi.vercel.app',
    email: process.env.SMOKE_EMAIL || env.SMOKE_EMAIL,
    password: process.env.SMOKE_PASSWORD || env.SMOKE_PASSWORD,
    supabaseUrl: process.env.SUPABASE_URL || env.SUPABASE_URL,
    supabaseServiceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
    superAdminId:
      process.env.SMOKE_SUPER_ADMIN_ID ||
      env.SMOKE_SUPER_ADMIN_ID ||
      '1a031c19-4d66-47fc-b34d-187efb454883',
  };

  if (!config.email || !config.password) {
    throw new Error(
      'Informe SMOKE_EMAIL e SMOKE_PASSWORD via variável de ambiente ou .env para executar o smoke.'
    );
  }
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error('Supabase URL/Service Role inválidos para o smoke test.');
  }

  return config;
}

function fetchTwoFactorCode({ supabaseUrl, supabaseServiceRoleKey, superAdminId }) {
  const url = `${supabaseUrl}/rest/v1/two_factor_codes?user_id=eq.${superAdminId}&order=created_at.desc&limit=1`;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = curlRequest({
      method: 'GET',
      url,
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      expectJson: true,
    });

    ensure(
      response.statusCode === 200,
      `Supabase retornou ${response.statusCode} ao buscar o código 2FA`
    );

    if (Array.isArray(response.data) && response.data.length > 0) {
      const [entry] = response.data;
      if (entry && typeof entry.code === 'string' && entry.code.length === 6) {
        return entry.code;
      }
    }

    sleep(400);
  }

  throw new Error('Não foi possível obter o código 2FA no Supabase.');
}

function formatCurrency(value) {
  return Number.parseFloat(value.toFixed(2));
}

function nowPlus(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function toSummaryItem(title, status, note) {
  return { title, status, note };
}

(function main() {
  const summary = [];
  const cleanup = {
    invitations: [],
    coverage: null,
  };

  let config;
  let accessToken;
  let tenantId;
  let clinicId;
  let professionalA;
  let professionalB;

  try {
    config = loadConfig();
    console.log('>>> Iniciando smoke tests no endpoint:', config.baseUrl);

    // 1) Sign-in
    console.log('1) Autenticação (sign-in)');
    const signInResponse = curlRequest({
      method: 'POST',
      url: `${config.baseUrl}/auth/sign-in`,
      body: {
        email: config.email,
        password: config.password,
        rememberMe: false,
        deviceInfo: { device: 'smoke-cli' },
      },
    });
    ensure(signInResponse.statusCode === 200, 'Falha no sign-in');
    ensure(
      signInResponse.data?.requiresTwoFactor && signInResponse.data.tempToken,
      'Resposta de sign-in não retornou tempToken para 2FA'
    );
    summary.push(toSummaryItem('Sign-in', signInResponse.statusCode));

    // 2) Trigger 2FA
    console.log('2) Solicitar envio do código 2FA');
    const sendTwoFactorResponse = curlRequest({
      method: 'POST',
      url: `${config.baseUrl}/auth/two-factor/send`,
      body: { tempToken: signInResponse.data.tempToken, method: 'email' },
    });
    ensure(sendTwoFactorResponse.statusCode === 200, 'Falha ao solicitar envio do 2FA');
    summary.push(toSummaryItem('Envio 2FA', sendTwoFactorResponse.statusCode));

    // 3) Buscar código no Supabase
    console.log('3) Buscando código 2FA no Supabase');
    const twoFactorCode = fetchTwoFactorCode({
      supabaseUrl: config.supabaseUrl,
      supabaseServiceRoleKey: config.supabaseServiceRoleKey,
      superAdminId: config.superAdminId,
    });

    // 4) Validar 2FA
    console.log('4) Validando código 2FA');
    const validateTwoFactorResponse = curlRequest({
      method: 'POST',
      url: `${config.baseUrl}/auth/two-factor/validate`,
      body: {
        tempToken: signInResponse.data.tempToken,
        code: twoFactorCode,
        trustDevice: false,
        deviceInfo: { userAgent: 'smoke-cli', device: 'curl-node' },
      },
    });
    ensure(validateTwoFactorResponse.statusCode === 200, 'Falha na validação 2FA');
    ensure(validateTwoFactorResponse.data?.accessToken, 'Resposta 2FA sem accessToken');
    ensure(validateTwoFactorResponse.data?.user?.tenantId, 'Resposta 2FA sem tenantId');

    accessToken = validateTwoFactorResponse.data.accessToken;
    tenantId = validateTwoFactorResponse.data.user.tenantId;
    summary.push(toSummaryItem('Validação 2FA', validateTwoFactorResponse.statusCode));

    console.log(
      `-> tenantId: ${tenantId} | accessToken: ${accessToken.slice(0, 16)}...`,
    );

    // 5) Listar clinicas e capturar uma disponível
    console.log('5) Listar clínicas disponíveis');
    const clinicsResponse = curlRequest({
      method: 'GET',
      url: `${config.baseUrl}/clinics?tenantId=${tenantId}&limit=10`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
      },
    });
    if (clinicsResponse.statusCode !== 200) {
      const bodyPreview = clinicsResponse.rawBody
        ? clinicsResponse.rawBody.toString('utf8').slice(0, 500)
        : 'sem corpo';
      throw new Error(
        `Falha ao listar clínicas (status ${clinicsResponse.statusCode}) - resposta: ${bodyPreview}`,
      );
    }
    ensure(Array.isArray(clinicsResponse.data?.data) && clinicsResponse.data.data.length > 0, 'Nenhuma clínica localizada para o tenant');

    clinicId = clinicsResponse.data.data[0].id;
    summary.push(
      toSummaryItem(
        'Listagem de clínicas',
        clinicsResponse.statusCode,
        `clinicId=${clinicId}`
      )
    );

    // 6) Capturar tipos de consulta (para resumo econômico)
    console.log('6) Listar tipos de serviço da clínica');
    const serviceTypesResponse = curlRequest({
      method: 'GET',
      url: `${config.baseUrl}/clinics/${clinicId}/service-types?tenantId=${tenantId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
      },
    });
    ensure(serviceTypesResponse.statusCode === 200, 'Falha ao listar tipos de serviço');
    ensure(
      Array.isArray(serviceTypesResponse.data) && serviceTypesResponse.data.length > 0,
      'Nenhum tipo de serviço disponível para convite'
    );
    const serviceTypeId = serviceTypesResponse.data[0].id;
    summary.push(
      toSummaryItem(
        'Listagem de tipos de serviço',
        serviceTypesResponse.statusCode,
        `serviceTypeId=${serviceTypeId}`
      )
    );

    // 7) Capturar membros profissionais
    console.log('7) Listar profissionais ativos da clínica');
    const membersResponse = curlRequest({
      method: 'GET',
      url: `${config.baseUrl}/clinics/${clinicId}/members?tenantId=${tenantId}&roles=PROFESSIONAL&status=active`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
      },
    });
    ensure(membersResponse.statusCode === 200, 'Falha ao listar membros');
    const professionals = Array.isArray(membersResponse.data?.data)
      ? membersResponse.data.data.filter((member) => member.role === 'PROFESSIONAL')
      : [];
    ensure(professionals.length >= 2, 'São necessários pelo menos dois profissionais ativos para o teste de cobertura.');
    [professionalA, professionalB] = professionals.slice(0, 2).map((member) => member.userId);
    summary.push(
      toSummaryItem(
        'Listagem de profissionais',
        membersResponse.statusCode,
        `titular=${professionalA} | cobertura=${professionalB}`
      )
    );

    const timestamp = Date.now();

    // 8) Criar convite
    console.log('8) Criar convite para novo profissional');
    const inviteEmail = `smoke.professional+${timestamp}@onterapi.com`;
    const economicSummary = {
      items: [
        {
          serviceTypeId,
          price: formatCurrency(250),
          currency: 'BRL',
          payoutModel: 'fixed',
          payoutValue: formatCurrency(150),
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    };
    const invitationResponse = curlRequest({
      method: 'POST',
      url: `${config.baseUrl}/clinics/${clinicId}/invitations`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
      },
      body: {
        tenantId,
        email: inviteEmail,
        channel: 'email',
        channelScope: 'direct',
        economicSummary,
        expiresAt: nowPlus(60 * 24 * 7),
        metadata: { origin: 'smoke-test', timestamp },
      },
    });
    ensure(invitationResponse.statusCode === 201, 'Falha ao criar convite');
    ensure(invitationResponse.data?.id, 'Convite criado sem ID');
    cleanup.invitations.push(invitationResponse.data.id);
    summary.push(
      toSummaryItem(
        'Convite emitido',
        invitationResponse.statusCode,
        `invitationId=${invitationResponse.data.id}`
      )
    );

    // 9) Criar aditivo econômico
    console.log('9) Criar aditivo econômico para profissional existente');
    const addendumResponse = curlRequest({
      method: 'POST',
      url: `${config.baseUrl}/clinics/${clinicId}/invitations/addendums`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
      },
      body: {
        tenantId,
        professionalId: professionalA,
        channel: 'email',
        channelScope: 'direct',
        economicSummary,
        expiresAt: nowPlus(60 * 24 * 3),
        effectiveAt: nowPlus(60 * 2),
        metadata: { origin: 'smoke-test', timestamp },
      },
    });
    ensure(addendumResponse.statusCode === 201, 'Falha ao criar aditivo');
    ensure(addendumResponse.data?.id, 'Aditivo sem ID');
    cleanup.invitations.push(addendumResponse.data.id);
    summary.push(
      toSummaryItem(
        'Aditivo emitido',
        addendumResponse.statusCode,
        `addendumId=${addendumResponse.data.id}`
      )
    );

    // 10) Criar cobertura temporária
    console.log('10) Criar cobertura temporária');
    const coverageResponse = curlRequest({
      method: 'POST',
      url: `${config.baseUrl}/clinics/${clinicId}/members/professional-coverages`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
      },
      body: {
        tenantId,
        professionalId: professionalA,
        coverageProfessionalId: professionalB,
        startAt: nowPlus(5),
        endAt: nowPlus(65),
        reason: 'Cobertura smoke test',
        notes: 'Gerado automaticamente pelo smoke test',
        metadata: { origin: 'smoke-test', timestamp },
      },
    });
    ensure(coverageResponse.statusCode === 201, 'Falha ao criar cobertura');
    ensure(coverageResponse.data?.id, 'Cobertura criada sem ID');
    cleanup.coverage = coverageResponse.data.id;
    summary.push(
      toSummaryItem(
        'Cobertura criada',
        coverageResponse.statusCode,
        `coverageId=${coverageResponse.data.id}`
      )
    );

    // 11) Listar coberturas
    console.log('11) Listar coberturas da clínica');
    const listCoveragesResponse = curlRequest({
      method: 'GET',
      url: `${config.baseUrl}/clinics/${clinicId}/members/professional-coverages?tenantId=${tenantId}&limit=10`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
      },
    });
    ensure(listCoveragesResponse.statusCode === 200, 'Falha ao listar coberturas');
    summary.push(
      toSummaryItem(
        'Listagem de coberturas',
        listCoveragesResponse.statusCode,
        `total=${listCoveragesResponse.data?.total ?? 'n/a'}`
      )
    );

    // 12) Export CSV coberturas
    console.log('12) Exportar coberturas (CSV/XLS/PDF)');
    const coverageExports = [
      {
        path: 'export',
        type: 'CSV',
        expectJson: false,
        contentType: 'text/csv',
      },
      {
        path: 'export.xls',
        type: 'XLS',
        expectJson: false,
        contentType: 'application/vnd.ms-excel',
      },
      {
        path: 'export.pdf',
        type: 'PDF',
        expectJson: false,
        contentType: 'application/pdf',
      },
    ];

    for (const exportConfig of coverageExports) {
      const exportResponse = curlRequest({
        method: 'GET',
        url: `${config.baseUrl}/clinics/${clinicId}/members/professional-coverages/${exportConfig.path}?tenantId=${tenantId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        expectJson: false,
      });
      ensure(
        exportResponse.statusCode === 200,
        `Falha ao exportar coberturas (${exportConfig.type})`
      );
      summary.push(
        toSummaryItem(
          `Export coberturas ${exportConfig.type}`,
          exportResponse.statusCode,
          `bytes=${exportResponse.rawBody.length}`
        )
      );
    }

    // 13) Export template overrides (CSV/XLS/PDF)
    console.log('13) Exportar overrides de template');
    const overrideExports = [
      { path: 'export', label: 'CSV' },
      { path: 'export.xls', label: 'XLS' },
      { path: 'export.pdf', label: 'PDF' },
    ];

    for (const exportConfig of overrideExports) {
      const exportResponse = curlRequest({
        method: 'GET',
        url: `${config.baseUrl}/clinics/${clinicId}/settings/template-overrides/${exportConfig.path}?tenantId=${tenantId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        expectJson: false,
      });
      ensure(
        exportResponse.statusCode === 200,
        `Falha ao exportar overrides (${exportConfig.label})`
      );
      summary.push(
        toSummaryItem(
          `Export overrides ${exportConfig.label}`,
          exportResponse.statusCode,
          `bytes=${exportResponse.rawBody.length}`
        )
      );
    }

    console.log('\n>>> Smoke tests concluídos com sucesso.\nResumo:');
    summary.forEach((item, index) => {
      const note = item.note ? ` - ${item.note}` : '';
      console.log(`${index + 1}. ${item.title}: HTTP ${item.status}${note}`);
    });
  } catch (error) {
    console.error('\n!!! Smoke tests falharam:', error.message);
    if (summary.length > 0) {
      console.error('Passos executados antes da falha:');
      summary.forEach((item, index) => {
        const note = item.note ? ` - ${item.note}` : '';
        console.error(`${index + 1}. ${item.title}: HTTP ${item.status}${note}`);
      });
    }
    process.exitCode = 1;
  } finally {
    if (accessToken && tenantId && cleanup.invitations.length > 0) {
      for (const invitationId of cleanup.invitations) {
        try {
          curlRequest({
            method: 'POST',
            url: `${config.baseUrl}/clinics/invitations/${invitationId}/revoke`,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'x-tenant-id': tenantId,
            },
            body: {
              tenantId,
              reason: 'Revogado automaticamente pelo smoke test',
            },
          });
        } catch (revokeError) {
          console.warn(`Aviso: falha ao revogar convite ${invitationId}: ${revokeError.message}`);
        }
      }
    }

    if (accessToken && tenantId && clinicId && cleanup.coverage) {
      try {
        curlRequest({
          method: 'PATCH',
          url: `${config.baseUrl}/clinics/${clinicId}/members/professional-coverages/${cleanup.coverage}/cancel`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-tenant-id': tenantId,
          },
          body: {
            tenantId,
            cancellationReason: 'Cancelado automaticamente pelo smoke test',
          },
        });
      } catch (cancelError) {
        console.warn(
          `Aviso: falha ao cancelar cobertura ${cleanup.coverage}: ${cancelError.message}`
        );
      }
    }
  }
})();
