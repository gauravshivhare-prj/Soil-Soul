import AuthLayout from "@/features/auth/AuthLayout";
import RegisterForm from "@/features/auth/RegisterForm";

export const metadata = { title: "Create Account | Soil & Soul" };

export default function RegisterPage() {
  return (
    <AuthLayout active="register">
      <RegisterForm />
    </AuthLayout>
  );
}
