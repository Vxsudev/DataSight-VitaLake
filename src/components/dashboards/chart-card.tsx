"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartDefinition, ChartType } from "@/lib/types";
import { BarChart, LineChart, AreaChart, PieChart as PieChartIcon } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, Area, AreaChart as RechartsAreaChart, Pie, PieChart as RechartsPieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChartCardProps {
  chart: ChartDefinition;
}

const iconMap: Record<ChartType, React.ElementType> = {
  line: LineChart,
  bar: BarChart,
  area: AreaChart,
  pie: PieChartIcon,
  donut: PieChartIcon,
  table: () => null,
};

const chartComponents = {
  line: RechartsLineChart,
  bar: RechartsBarChart,
  area: RechartsAreaChart,
  pie: RechartsPieChart,
  donut: RechartsPieChart,
};

const renderers = {
  line: (config: ChartDefinition['config'], colors: string[]) => (
    <>
      {config.yAxis.map((axis, index) => (
        <Line 
          key={axis}
          type="monotone" 
          dataKey={axis} 
          stroke={colors[index % colors.length]} 
          strokeWidth={2} 
          dot={false} 
        />
      ))}
    </>
  ),
  bar: (config: ChartDefinition['config'], colors: string[]) => (
    <>
      {config.yAxis.map((axis, index) => (
        <Bar 
          key={axis}
          dataKey={axis} 
          fill={colors[index % colors.length]} 
          radius={[4, 4, 0, 0]} 
        />
      ))}
    </>
  ),
  area: (config: ChartDefinition['config'], colors: string[]) => (
    <>
      {config.yAxis.map((axis, index) => (
        <Area 
          key={axis}
          type="monotone" 
          dataKey={axis} 
          stroke={colors[index % colors.length]} 
          fill={`${colors[index % colors.length]}33`} // Add transparency
          stackId={config.yAxis.length > 1 ? "1" : undefined} // Stack multiple areas
        />
      ))}
    </>
  ),
  pie: (config: ChartDefinition['config'], colors: string[], data: any[]) => (
    <Pie 
      data={data} 
      dataKey={config.yAxis[0]} 
      nameKey={config.xAxis} 
      cx="50%" 
      cy="50%" 
      outerRadius={80} 
      fill={colors[0]} 
      label={(entry) => `${entry[config.xAxis]}: ${entry[config.yAxis[0]]}`}
    />
  ),
  donut: (config: ChartDefinition['config'], colors: string[], data: any[]) => (
    <Pie 
      data={data} 
      dataKey={config.yAxis[0]} 
      nameKey={config.xAxis} 
      cx="50%" 
      cy="50%" 
      innerRadius={40}
      outerRadius={80} 
      fill={colors[0]} 
      label={(entry) => `${entry[config.xAxis]}: ${entry[config.yAxis[0]]}`}
    />
  ),
};

export function ChartCard({ chart }: ChartCardProps) {
  const ChartIcon = iconMap[chart.type] || LineChart;
  
  // Generate colors for multiple series
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))", 
    "hsl(220, 90%, 56%)", // Blue
    "hsl(142, 76%, 36%)", // Green
    "hsl(45, 93%, 47%)",  // Yellow
    "hsl(0, 84%, 60%)",   // Red
    "hsl(262, 83%, 58%)", // Purple
    "hsl(203, 89%, 53%)", // Cyan
  ];
  
  const chartConfig = useMemo(() => {
    const config: any = {};
    chart.config.yAxis.forEach((axis, index) => {
      config[axis] = {
        label: axis,
        color: colors[index % colors.length],
      };
    });
    return config;
  }, [chart.config, colors]);

  const ChartComponent = chart.type !== 'table' && chart.type !== 'pie' && chart.type !== 'donut' ? chartComponents[chart.type] : RechartsBarChart;
  const renderer = chart.type !== 'table' ? renderers[chart.type] : renderers['bar'];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{chart.name}</CardTitle>
        <ChartIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
             {chart.type === 'pie' || chart.type === 'donut' ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                        <Tooltip content={<ChartTooltipContent />} />
                        {renderer(chart.config, colors, chart.data)}
                    </RechartsPieChart>
                </ResponsiveContainer>
             ) : chart.type === 'table' ? (
                <div className="overflow-auto h-full">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2 font-medium">{chart.config.xAxis}</th>
                        {chart.config.yAxis.map(col => (
                          <th key={col} className="text-left p-2 font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chart.data.slice(0, 100).map((row, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{row[chart.config.xAxis]}</td>
                          {chart.config.yAxis.map(col => (
                            <td key={col} className="p-2">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             ) : (
                <ChartComponent data={chart.data}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey={chart.config.xAxis} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Legend />
                    {renderer(chart.config, colors, chart.data)}
                </ChartComponent>
             )}
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
