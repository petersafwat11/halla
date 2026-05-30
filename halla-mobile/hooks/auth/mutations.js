import { useMutation } from "@tanstack/react-query";
import { signupVendor, signupWhitelabel } from "./_api";

export function useVendorSignup() {
  return useMutation({
    mutationFn: signupVendor,
  });
}

export function useWhitelabelSignup() {
  return useMutation({
    mutationFn: signupWhitelabel,
  });
}
