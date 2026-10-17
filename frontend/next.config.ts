import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/customers/new",
        destination: "/dashboard/customers?modal=group-create",
        permanent: false,
      },
      {
        source: "/dashboard/customers/master/new",
        destination: "/dashboard/customers?tab=master&modal=master-create",
        permanent: false,
      },
      {
        source: "/dashboard/customers/:id",
        destination: "/dashboard/customers?modal=group-details&id=:id",
        permanent: false,
      },
      {
        source: "/dashboard/customers/:id/edit",
        destination: "/dashboard/customers?modal=group-edit&id=:id",
        permanent: false,
      },
      {
        source: "/dashboard/customers/master/:id",
        destination: "/dashboard/customers?tab=master&modal=master-details&id=:id",
        permanent: false,
      },
      {
        source: "/dashboard/customers/master/:id/edit",
        destination: "/dashboard/customers?tab=master&modal=master-edit&id=:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
