
"use client";

import React from "react";
import "./PremiumOutstandingReport.css";

export type PremiumOutstandingRow = {
  policyNo: string;
  ageCode?: string;
  commissionCode?: string;
  date?: string;
  planTermMode?: string;
  branch?: string;
  installmentPremium: number;
  fupDate?: string;
  amountDue1: number;
  dueDate1?: string;
  amountDue2: number;
  dueDate2?: string;
  taxBenefit?: number;
  depositsExtraCharges?: number;
};

export type PremiumOutstandingGroup = {
  code: string;
  name: string;
  customers: {
    name: string;
    telephone?: string;
    rows: PremiumOutstandingRow[];
  }[];
};

type Props = {
  advisorName: string;
  qualification?: string;
  address?: string;
  phone?: string;
  email?: string;
  reportDate: string;
  periodFrom: string;
  periodTo: string;
  groups: PremiumOutstandingGroup[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const sum = (rows: PremiumOutstandingRow[], key: keyof PremiumOutstandingRow) =>
  rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

export default function PremiumOutstandingReport({
  advisorName,
  qualification,
  address,
  phone,
  email,
  reportDate,
  periodFrom,
  periodTo,
  groups,
}: Props) {
  return (
    <div className="premium-report">
      <div className="report-toolbar">
        <span>Premium Outstanding Statement</span>
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <article className="report-page">
        <header className="advisor-header">
          <div className="advisor-name">{advisorName}</div>
          {qualification && <div>{qualification}</div>}
          {address && <div>{address}</div>}
          {phone && <div>{phone}</div>}
          {email && <div>{email}</div>}
        </header>

        <div className="report-title">
          <strong>Premium Outstanding Statement</strong>
          <strong>Groupwise</strong>
        </div>

        <div className="report-meta">
          <div>Date of Report: {reportDate}</div>
          <div>
            Premium Outstanding between {periodFrom} and {periodTo}
          </div>
        </div>

        {groups.map((group) => {
          const groupRows = group.customers.flatMap(
            (customer) => customer.rows
          );

          return (
            <section className="report-group" key={group.code}>
              <h3 className="group-heading">
                {group.code}: {group.name}
              </h3>

              {group.customers.map((customer, customerIndex) => (
                <div
                  className="customer-section"
                  key={`${group.code}-${customer.name}-${customerIndex}`}
                >
                  <div className="customer-heading">
                    <strong>{customer.name}</strong>
                    {customer.telephone && (
                      <span>Tel: {customer.telephone}</span>
                    )}
                  </div>

                  <div className="table-scroll">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>Policy No.</th>
                          <th rowSpan={2}>Ag Cd</th>
                          <th rowSpan={2}>Comm. Cd</th>
                          <th rowSpan={2}>Date</th>
                          <th rowSpan={2}>Pl/Tm/Pt Md.</th>
                          <th rowSpan={2}>Brn</th>
                          <th rowSpan={2}>Installment Premium</th>
                          <th rowSpan={2}>FUP Date</th>
                          <th colSpan={4}>Amount to be Paid (Upto)</th>
                          <th rowSpan={2}>Tax / Benefit</th>
                          <th rowSpan={2}>Deps. / X-charge</th>
                        </tr>
                        <tr>
                          <th>Rs.</th>
                          <th>dd/mm</th>
                          <th>Rs.</th>
                          <th>dd/mm</th>
                        </tr>
                      </thead>

                      <tbody>
                        {customer.rows.map((row, index) => (
                          <tr key={`${row.policyNo}-${index}`}>
                            <td>{row.policyNo}</td>
                            <td>{row.ageCode || ""}</td>
                            <td>{row.commissionCode || ""}</td>
                            <td>{row.date || ""}</td>
                            <td>{row.planTermMode || ""}</td>
                            <td>{row.branch || ""}</td>
                            <td className="number">
                              {money(row.installmentPremium)}
                            </td>
                            <td>{row.fupDate || ""}</td>
                            <td className="number">
                              {money(row.amountDue1)}
                            </td>
                            <td>{row.dueDate1 || ""}</td>
                            <td className="number">
                              {money(row.amountDue2)}
                            </td>
                            <td>{row.dueDate2 || ""}</td>
                            <td className="number">
                              {money(row.taxBenefit || 0)}
                            </td>
                            <td className="number">
                              {money(row.depositsExtraCharges || 0)}
                            </td>
                          </tr>
                        ))}

                        <tr className="total-row">
                          <td colSpan={8} className="total-label">
                            Total:
                          </td>
                          <td className="number">
                            {money(sum(customer.rows, "amountDue1"))}
                          </td>
                          <td />
                          <td className="number">
                            {money(sum(customer.rows, "amountDue2"))}
                          </td>
                          <td colSpan={3} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="group-total">
                <strong>Group Total:</strong>
                <strong>
                  {money(sum(groupRows, "amountDue1"))}
                </strong>
                <strong>
                  {money(sum(groupRows, "amountDue2"))}
                </strong>
              </div>
            </section>
          );
        })}

        {groups.length === 0 && (
          <div className="report-empty">
            No premium outstanding records found for the selected period.
          </div>
        )}
      </article>
    </div>
  );
}
