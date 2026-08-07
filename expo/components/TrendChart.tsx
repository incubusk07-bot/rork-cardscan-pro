import React, { useMemo } from "react";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { colors } from "@/constants/theme";

interface TrendChartProps {
  points: number[];
  width: number;
  height: number;
  stroke?: string;
  gradientId?: string;
}

/** Lightweight SVG sparkline with soft gradient area fill. */
export default function TrendChart({
  points,
  width,
  height,
  stroke = colors.gold,
  gradientId = "trendFill",
}: TrendChartProps) {
  const { linePath, areaPath } = useMemo(() => {
    const values = points.length >= 2 ? points : [points[0] ?? 0, points[0] ?? 0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padY = 6;
    const usable = height - padY * 2;
    const stepX = width / (values.length - 1);

    const coords = values.map((v, i) => ({
      x: i * stepX,
      y: height - padY - ((v - min) / range) * usable,
    }));

    let line = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      line += ` C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { linePath: line, areaPath: area };
  }, [points, width, height]);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradientId})`} />
      <Path d={linePath} stroke={stroke} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
