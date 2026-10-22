import AuthLayout from "@/features/auth/AuthLayout";
import LoginForm from "@/features/auth/LoginForm";

export const metadata = { title: "Login | Soil & Soul" };

export default function LoginPage() {
  return (
    <AuthLayout active="login">
      <LoginForm />
    </AuthLayout>
  );
}
