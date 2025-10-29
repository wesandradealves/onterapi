import { z } from 'zod';

const paletteSchema = z
  .object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    surface: z.string().optional(),
    text: z.string().optional(),
  })
  .optional();

const typographySchema = z
  .object({
    primaryFont: z.string().optional(),
    secondaryFont: z.string().optional(),
    headingWeight: z.number().int().optional(),
    bodyWeight: z.number().int().optional(),
  })
  .optional();

const previewSchema = z
  .object({
    mode: z.string().min(1),
    generatedAt: z.string().datetime().optional(),
    previewUrl: z.string().url().optional(),
  })
  .optional();

export const updateClinicBrandingSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  brandingSettings: z.object({
    logoUrl: z.string().url().optional(),
    darkLogoUrl: z.string().url().optional(),
    palette: paletteSchema,
    typography: typographySchema,
    customCss: z.string().optional(),
    applyMode: z.string().min(1),
    preview: previewSchema,
    versionLabel: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateClinicBrandingSettingsSchema = z.infer<typeof updateClinicBrandingSettingsSchema>;
