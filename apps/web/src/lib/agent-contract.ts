import { z } from "zod";

export const agentPrinterSchema = z.object({
  name: z.string().trim().min(1).max(256),
  isValid: z.boolean(),
});

export const agentRegistrationSchema = z.object({
  installationId: z.string().uuid(),
  machineName: z.string().trim().min(1).max(128),
  version: z.string().trim().min(1).max(64),
});

export const agentHeartbeatSchema = z.object({
  machineName: z.string().trim().min(1).max(128),
  version: z.string().trim().min(1).max(64),
  selectedWindowsPrinterName: z.string().trim().min(1).max(256).nullable(),
  printers: z.array(agentPrinterSchema).max(100),
}).superRefine((value, context) => {
  const names = value.printers.map((printer) => printer.name.toLocaleLowerCase());
  if (new Set(names).size !== names.length) {
    context.addIssue({ code: "custom", message: "Printer names must be unique." });
  }
  if (value.selectedWindowsPrinterName && !value.printers.some((printer) => printer.name === value.selectedWindowsPrinterName)) {
    context.addIssue({ code: "custom", message: "The selected printer must be present in discovery results." });
  }
});

export const agentJobStatusSchema = z.object({
  claimToken: z.string().min(20).max(256),
  status: z.enum(["PRINTING", "COMPLETED", "FAILED"]),
  errorCode: z.string().trim().min(1).max(64).optional(),
  errorMessage: z.string().trim().min(1).max(1000).optional(),
});
