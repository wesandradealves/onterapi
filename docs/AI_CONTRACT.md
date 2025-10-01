# Contrato de Integra��o IA

## Vis�o Geral do Fluxo
1. **Submit da anamnese** (`POST /anamneses/:id/submit`)
   - Backend valida os passos e marca a anamnese como `submitted`.
   - Gera um **compact summary** com os dados relevantes da anamnese atual.
   - Consulta o �ltimo **rollup** do paciente (`patient_anamnesis_rollups`).
   - Publica o evento `ANAMNESIS_SUBMITTED` com informa��es da anamnese, `compactAnamnesis` e `patientRollup` para o worker.
2. **Worker de IA**
   - Consome o evento `ANAMNESIS_SUBMITTED`.
  - Monta o prompt combinando `compactAnamnesis` + `patientRollup` e chama o provider.
   - Envia o resultado no webhook `POST /anamneses/:id/ai-result` (com HMAC, se habilitado).
3. **Webhook IA** (`POST /anamneses/:id/ai-result`)
   - Persiste a resposta bruta em `anamnesis_ai_analyses` (modelo, tokens, lat�ncia, raw JSON).
   - Materializa o plano corrente em `anamnesis_therapeutic_plans` com status `generated`.
   - Emite `ANAMNESIS_PLAN_GENERATED` para o front/worker acompanhar.
4. **Aceite do profissional** (`POST /anamneses/:id/plan`)
   - Requer `termsVersion`, `termsTextSnapshot` e `termsAccepted = true`.
   - Atualiza o plano para `accepted`, registra `therapeutic_plan_acceptances` (snapshot legal) e recalcula `patient_anamnesis_rollups`.
   - Reemite `ANAMNESIS_PLAN_GENERATED` com status atualizado.

## Webhook (`POST /anamneses/:id/ai-result`)
```jsonc
{
  "analysisId": "a1b2c3d4",
  "status": "completed",
  "clinicalReasoning": "Por conta da cefaleia...",
  "summary": "Plano focado em controle de dor",
  "therapeuticPlan": { "goals": ["Dormir melhor"] },
  "riskFactors": [],
  "recommendations": [],
  "planText": "1) Fitoterapia X 200mg...",
  "reasoningText": "Justifica-se devido a...",
  "evidenceMap": [
    {
      "recommendation": "Fitoterapia X",
      "evidence": ["ins�nia", "estresse elevado"],
      "confidence": 0.72
    }
  ],
  "confidence": 0.78,
  "model": "gpt-4o-mini-2025",
  "promptVersion": "v2025-09-28",
  "tokensInput": 1345,
  "tokensOutput": 987,
  "latencyMs": 7432,
  "rawResponse": { "providerPayload": "..." },
  "respondedAt": "2025-09-29T15:05:00Z"
}
```
- `status = "failed"` deve ser usado quando a IA n�o gerar plano (preencher `errorMessage`).
- Campos de metadado s�o opcionais, mas recomendados para monitorar custo/SLAs.

## Aceite (`POST /anamneses/:id/plan`)
```json
{
  "analysisId": "a1b2c3d4",
  "planText": "1) Fitoterapia X ...",
  "reasoningText": "Justificativa...",
  "evidenceMap": [ ... ],
  "therapeuticPlan": { ... },
  "riskFactors": [ ... ],
  "recommendations": [ ... ],
  "confidence": 0.78,
  "reviewRequired": false,
  "termsVersion": "v1.3-2025-09-20",
  "termsTextSnapshot": "Declaro estar ciente de que o plano terap�utico � de minha responsabilidade...",
  "termsAccepted": true,
  "generatedAt": "2025-09-29T15:05:00Z"
}
```
- O backend cria um registro em `therapeutic_plan_acceptances` (snapshot legal + IP/User-Agent) e atualiza o plano para `accepted`.
- Recalcula o rollup no `PatientAnamnesisRollupService`.

## Resposta (`GET /anamneses/:id/plan`)
```jsonc
{
  "id": "p1",
  "anamnesisId": "a1",
  "analysisId": "a1b2c3d4",
  "planText": "1) ...",
  "reasoningText": "Justificativa...",
  "evidenceMap": [ ... ],
  "confidence": 0.78,
  "status": "accepted",
  "termsAccepted": true,
  "termsVersion": "v1.3-2025-09-20",
  "termsTextSnapshot": "Declaro estar ciente...",
  "acceptances": [
    {
      "id": "acc-1",
      "professionalId": "prof-1",
      "acceptedAt": "2025-09-29T15:20:31Z",
      "termsVersion": "v1.3-2025-09-20",
      "termsTextSnapshot": "Declaro estar ciente...",
      "acceptedIp": "203.0.113.10",
      "acceptedUserAgent": "Mozilla/5.0"
    }
  ]
}
```

## Migrations
1. `1738600000000-UpdateAnamnesisAIAndPlans`
2. `1738601000000-CreateTherapeuticPlanAcceptances`
3. `1738602000000-CreatePatientAnamnesisRollups`

Rodar localmente:
```bash
npm run migration:run
```

## Eventos
- `ANAMNESIS_SUBMITTED`: inclui `compactAnamnesis` e `patientRollup` (quando existir).
- `ANAMNESIS_AI_COMPLETED`: agora leva metadados da IA (`planText`, `reasoningText`, `evidenceMap`, tokens, lat�ncia, rawResponse).
- `ANAMNESIS_PLAN_GENERATED`: disparado na gera��o e aceita��o do plano (status + termos).
- `ANAMNESIS_PLAN_FEEDBACK_SAVED`: feedback like/dislike/coment�rio.

## Requisitos para o Worker
- Tratar aus�ncia de `patientRollup` como primeira anamnese.
- Ambiente local pode usar `ANAMNESIS_AI_WORKER_MODE=local` para gerar resposta heur�stica e postar no webhook.
- Versionar prompts (`promptVersion`).
- Preencher m�tricas (`tokensInput`, `tokensOutput`, `latencyMs`) quando dispon�veis.
- Enviar `errorMessage` em falhas (status `failed`).

## Recomenda��es ao Front-End
- Exibir `planText` e `reasoningText` em colunas.
- Mostrar `termsTextSnapshot` com op��o de expandir e exigir `termsAccepted`.
- Evidence map em acorde�o/tabela.
- Like/dislike somente ap�s status `accepted`.
- Guardar IP/User-Agent para auditoria (j� capturado pelo backend se enviado no header padr�o).

## Checklist de Integra��o
- [ ] Atualizar worker para o novo contrato do webhook.
- [ ] Incluir `termsVersion` + `termsTextSnapshot` no POST /plan.
- [ ] Rodar migrations em todos os ambientes.
- [ ] Validar renderiza��o do plano/racioc�nio/evid�ncias no front.
- [ ] Monitorar m�tricas (tokens, lat�ncia) e LOGs para custos.
