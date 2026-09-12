"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  MapPin,
  Briefcase,
  Shield,
  ArrowRight,
  Building,
  UserCog,
} from "lucide-react";

export default function OrganizationPage() {
  const router = useRouter();

  const modules = [
    {
      id: "agency-master",
      title: "Agency Master",
      description: "Manage all agencies and their details",
      icon: Building2,
      color: "blue",
      href: "/dashboard/organization/agency-master",
    },
    {
      id: "branches",
      title: "Branches",
      description: "View and manage branch offices",
      icon: Building,
      color: "green",
      href: "/dashboard/organization/branches",
    },
    {
      id: "area-master",
      title: "Area Master",
      description: "Manage geographical areas and regions",
      icon: MapPin,
      color: "purple",
      href: "/dashboard/organization/area-master",
    },
    {
      id: "employees",
      title: "Employees",
      description: "Manage employee records and details",
      icon: Users,
      color: "orange",
      href: "/dashboard/organization/employees",
    },
    {
      id: "principal-broker",
      title: "Principal Broker",
      description: "Manage principal broker information",
      icon: Shield,
      color: "red",
      href: "/dashboard/organization/principal-broker",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "bg-blue-50",
        hover: "hover:bg-blue-100",
        border: "border-blue-200",
        icon: "text-blue-600",
        iconBg: "bg-blue-100",
        arrow: "text-blue-600",
      },
      green: {
        bg: "bg-green-50",
        hover: "hover:bg-green-100",
        border: "border-green-200",
        icon: "text-green-600",
        iconBg: "bg-green-100",
        arrow: "text-green-600",
      },
      purple: {
        bg: "bg-purple-50",
        hover: "hover:bg-purple-100",
        border: "border-purple-200",
        icon: "text-purple-600",
        iconBg: "bg-purple-100",
        arrow: "text-purple-600",
      },
      orange: {
        bg: "bg-orange-50",
        hover: "hover:bg-orange-100",
        border: "border-orange-200",
        icon: "text-orange-600",
        iconBg: "bg-orange-100",
        arrow: "text-orange-600",
      },
      red: {
        bg: "bg-red-50",
        hover: "hover:bg-red-100",
        border: "border-red-200",
        icon: "text-red-600",
        iconBg: "bg-red-100",
        arrow: "text-red-600",
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <Building2 size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Organization Management
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              Manage your organization structure and settings
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Agencies", value: "12" },
          { label: "Branches", value: "24" },
          { label: "Areas", value: "8" },
          { label: "Employees", value: "156" },
          { label: "Brokers", value: "5" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
            <div>
              <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <div
              key={module.id}
              onClick={() => router.push(module.href)}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md cursor-pointer"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2] transition-colors duration-200 group-hover:bg-[#1877F2] group-hover:text-white">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold tracking-tight text-[#0f172a]">
                  {module.title}
                </h3>
                <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                  {module.description}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="shrink-0 text-[#1877F2] transition-transform duration-200 group-hover:translate-x-1"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}