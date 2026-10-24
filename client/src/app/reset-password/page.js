import AuthLayout from "@/features/auth/AuthLayout";
import ResetPasswordForm from "@/features/auth/ResetPasswordForm";

export const metadata = { title: "Reset Password | Soil & Soul" };

export default function ResetPasswordPage() {
  return (
    <AuthLayout active="login">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
