import { useMutation } from "@tanstack/react-query";
import { signupVendorAPI, signupWhitelabelAPI } from "../../services/authService";

export function useVendorSignup() {
  return useMutation({
    mutationFn: signupVendorAPI,
  });
}

export function useWhitelabelSignup() {
  return useMutation({
    mutationFn: signupWhitelabelAPI,
  });
}
