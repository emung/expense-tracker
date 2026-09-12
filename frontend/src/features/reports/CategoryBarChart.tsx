import { Group, Paper, Text, useComputedColorScheme } from '@mantine/core';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type RectangleProps,
} from 'recharts';
import type { CategoryTotal } from '../../api/types';
import { formatPercent, formatRon } from '../../lib/format';

/**
 * One series (net spend) over unordered categories: a single hue for every bar, no legend, no per-category colors.
 * Values are the dataviz reference palette - slot 1 blue, validated for both surfaces - plus its chrome tokens.
 */
const PALETTE = {
  light: { bar: '#2a78d6', barHover: '#3987e5', grid: '#e1e0d9', baseline: '#c3c2b7', tick: '#898781', label: '#52514e', cursor: 'rgba(11, 11, 11, 0.04)' },
  dark: { bar: '#3987e5', barHover: '#5598e7', grid: '#2c2c2a', baseline: '#383835', tick: '#898781', label: '#c3c2b7', cursor: 'rgba(255, 255, 255, 0.05)' },
} as const;

const ROW_HEIGHT = 32;
const AXIS_BAND = 28;
const BAR_THICKNESS = 16;
const CATEGORY_AXIS_WIDTH = 140;
/** Room right of the plot so the one direct label at the longest bar's tip is never clipped. */
const LABEL_ROOM = 96;

const tickFormat = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0, useGrouping: 'always' });

export function CategoryBarChart({ categories }: { categories: CategoryTotal[] }) {
  const colors = PALETTE[useComputedColorScheme('light')];
  const rows = categories.filter((category) => category.netRon !== 0);
  if (rows.length === 0) {
    return null;
  }

  // Label only the extreme; the axis, tooltip and table carry the other values.
  const largestIndex = rows.reduce((best, row, index) => (row.netRon > (rows[best]?.netRon ?? 0) ? index : best), 0);
  const labelledIndex = (rows[largestIndex]?.netRon ?? 0) > 0 ? largestIndex : -1;

  return (
    <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + AXIS_BAND}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: LABEL_ROOM, bottom: 0, left: 0 }} barCategoryGap={0}>
        <CartesianGrid horizontal={false} stroke={colors.grid} strokeWidth={1} />
        <XAxis
          type="number"
          height={AXIS_BAND}
          tickFormatter={(value: number) => tickFormat.format(value)}
          tick={{ fill: colors.tick, fontSize: 12, style: { fontVariantNumeric: 'tabular-nums' } }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={CATEGORY_AXIS_WIDTH}
          interval={0}
          tick={{ fill: colors.label, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke={colors.baseline} strokeWidth={1} />
        <Tooltip
          cursor={{ fill: colors.cursor }}
          isAnimationActive={false}
          content={({ active, payload }) => <ChartTooltip active={active} payload={payload} keyColor={colors.bar} />}
        />
        <Bar
          dataKey="netRon"
          barSize={BAR_THICKNESS}
          fill={colors.bar}
          activeBar={{ fill: colors.barHover }}
          shape={roundedAtDataEnd}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="netRon"
            content={(props) => {
              if (props.index !== labelledIndex) return null;
              const x = Number(props.x) + Number(props.width) + 8;
              const y = Number(props.y) + Number(props.height) / 2;
              return (
                <text x={x} y={y} dominantBaseline="central" fill={colors.label} fontSize={12} fontWeight={600}>
                  {formatRon(Number(props.value))}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 4px rounding on the data end only; the baseline end stays square, also for negative (refund-heavy) bars. */
function roundedAtDataEnd(props: unknown) {
  const { value, ...rectangle } = props as RectangleProps & { value?: number | number[] };
  const negative = typeof value === 'number' && value < 0;
  return <Rectangle {...rectangle} radius={negative ? [4, 0, 0, 4] : [0, 4, 4, 0]} />;
}

/** Value leads; the category is secondary and keyed with a short line in the bar color. */
interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  keyColor: string;
}

function ChartTooltip({ active, payload, keyColor }: ChartTooltipProps) {
  const row = active ? (payload?.[0]?.payload as CategoryTotal | undefined) : undefined;
  if (!row) {
    return null;
  }
  return (
    <Paper withBorder shadow="sm" px="sm" py={6} radius="sm">
      <Text fw={700} size="sm">
        {formatRon(row.netRon)}
      </Text>
      <Group gap={6} wrap="nowrap">
        <span aria-hidden style={{ display: 'inline-block', width: 12, height: 2, borderRadius: 1, background: keyColor }} />
        <Text size="xs" c="dimmed">
          {row.name} · {formatPercent(row.percentage)}
        </Text>
      </Group>
      {row.refundRon > 0 && (
        <Text size="xs" c="dimmed">
          {formatRon(row.expenseRon)} cheltuieli − {formatRon(row.refundRon)} retururi
        </Text>
      )}
    </Paper>
  );
}
