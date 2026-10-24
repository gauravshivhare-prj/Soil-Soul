import AuthLayout from "@/features/auth/AuthLayout";
import VerifyEmailForm from "@/features/auth/VerifyEmailForm";

export const metadata = { title: "Verify Email | Soil & Soul" };

export default function VerifyEmailPage() {
  return (
    <AuthLayout active="register">
      <VerifyEmailForm />
    </AuthLayout>
  );
}
