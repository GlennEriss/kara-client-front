"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardDistributionBlock } from '../../entities/dashboard.types';

export default function DashboardDistributionChart({ distribution, chartData, isMobile, formatValue, shortLabel, tickFormatter }: {
  distribution: DashboardDistributionBlock;
  chartData: Array<{ label: string; value: number; fill: string }>;
  isMobile: boolean;
  formatValue: (value: number) => string;
  shortLabel: (label: string) => string;
  tickFormatter: (label: string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {distribution.chartType === "pie" ? (
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`${distribution.key}-${entry.label}-${index}`}
                fill={entry.fill}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              formatValue(value)
            }
            labelFormatter={(label: string) =>
              shortLabel(label)
            }
          />
        </PieChart>
      ) : (
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: isMobile ? 10 : 11 }}
            interval={0}
            minTickGap={isMobile ? 14 : 8}
            tickMargin={isMobile ? 10 : 8}
            angle={isMobile ? -18 : 0}
            textAnchor={isMobile ? "end" : "middle"}
            height={isMobile ? 58 : 34}
            tickFormatter={tickFormatter}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) =>
              formatValue(value)
            }
            labelFormatter={(label: string) =>
              shortLabel(label)
            }
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`${distribution.key}-bar-${entry.label}-${index}`}
                fill={entry.fill}
              />
            ))}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
