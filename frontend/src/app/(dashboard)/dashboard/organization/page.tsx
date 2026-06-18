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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Organization Management
        </h1>
        <p className="text-slate-500">
          Manage your organization structure and settings
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Agencies</p>
          <p className="text-2xl font-bold text-slate-900">12</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Branches</p>
          <p className="text-2xl font-bold text-slate-900">24</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Areas</p>
          <p className="text-2xl font-bold text-slate-900">8</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Employees</p>
          <p className="text-2xl font-bold text-slate-900">156</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Brokers</p>
          <p className="text-2xl font-bold text-slate-900">5</p>
        </div>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const colors = getColorClasses(module.color);
          const Icon = module.icon;

          return (
            <div
              key={module.id}
              onClick={() => router.push(module.href)}
              className={`
                group relative bg-white rounded-xl shadow-sm border border-slate-200
                p-6 cursor-pointer transition-all duration-200
                hover:shadow-lg hover:border-transparent
                ${colors.hover}
              `}
            >
              {/* Icon */}
              <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center mb-4
                ${colors.iconBg}
              `}>
                <Icon className={`w-7 h-7 ${colors.icon}`} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {module.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-500 mb-4">
                {module.description}
              </p>

              {/* Arrow indicator */}
              <div className="flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>

              {/* Subtle hover effect */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-400 transition-colors pointer-events-none"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}