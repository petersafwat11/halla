import { useMutation } from "@tanstack/react-query";
import { signupVendor } from "./_api";

export function useVendorSignup() {
  return useMutation({
    mutationFn: signupVendor,
  });
}
