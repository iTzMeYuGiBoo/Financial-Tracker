import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useAppDispatch } from "../hooks/useAppDispatch";
import { register as registerAction } from "../store/slices/authSlice";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const schema = z.object({
  firstName:z.string().min(1),
  lastName:z.string().min(1),
  email:z.string().email(),
  password:z.string()
    .min(8,"Min 8 chars")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, "Use upper, lower, number, and special char"),
});
type F = z.infer<typeof schema>;

const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: F) => {
    try { await dispatch(registerAction(data)).unwrap(); toast.success("Account created!"); navigate("/dashboard"); }
    catch (e: any) { toast.error(e || "Registration failed"); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg"><TrendingUp className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start tracking your finances today</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">First Name</label><input {...register("firstName")} className="input" placeholder="John" />{errors.firstName&&<p className="text-xs text-red-500 mt-1">Required</p>}</div>
              <div><label className="label">Last Name</label><input {...register("lastName")} className="input" placeholder="Doe" /></div>
            </div>
            <div><label className="label">Email</label><input {...register("email")} type="email" className="input" placeholder="you@example.com" />{errors.email&&<p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}</div>
            <div><label className="label">Password</label><input {...register("password")} type="password" className="input" placeholder="Min 8 chars incl. Aa1!" />{errors.password&&<p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}</div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">{isSubmitting?<LoadingSpinner size="sm"/>:"Create Account"}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
