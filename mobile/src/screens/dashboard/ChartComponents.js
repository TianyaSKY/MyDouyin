import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
const C = {
  bg: '#0B0F19', card: '#111827', cardBorder: '#1E2433', surface: '#1F2937',
  text: '#E5E7EB', textSec: '#9CA3AF', textMut: '#6B7280', accent: '#3B82F6',
};

/** Convert '#RRGGBB' + alpha(0-1) to 'rgba(r,g,b,a)' */
function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─── Section Card ─── */
export function SectionCard({ title, icon, children }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Ionicons name={icon} size={15} color={C.textSec} />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/* ─── KPI Item ─── */
export function KpiItem({ label, value, icon, color }) {
  return (
    <View style={[s.kpiItem, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={s.kpiTop}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Ionicons name={icon} size={14} color={rgba(color, 0.5)} />
      </View>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

/* ─── Bar Chart ─── */
export function BarChartView({ data, barColor, height = 110 }) {
  if (!data || data.length === 0) return <Text style={s.empty}>暂无数据</Text>;
  const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const barW = Math.max(3, (SW - 96) / data.length - 2);
  return (
    <View>
      <View style={[s.barRow, { height }]}>
        {data.map((d, i) => {
          const h = ((Number(d.value) || 0) / maxVal) * (height - 14);
          return (
            <View key={i} style={s.barCol}>
              <View style={[s.bar, { height: Math.max(h, 2), width: barW, backgroundColor: barColor }]} />
            </View>
          );
        })}
      </View>
      <View style={s.barLabels}>
        {data.map((d, i) =>
          i % Math.max(1, Math.floor(data.length / 6)) === 0 ? (
            <Text key={i} style={[s.axisLabel, { width: barW + 2 }]} numberOfLines={1}>
              {d.date ? d.date.slice(5) : ''}
            </Text>
          ) : <View key={i} style={{ width: barW + 2 }} />
        )}
      </View>
    </View>
  );
}

/* ─── Horizontal Bar ─── */
export function HBarChart({ items }) {
  if (!items || items.length === 0) return <Text style={s.empty}>暂无数据</Text>;
  const maxVal = Math.max(...items.map(d => d.value || 0), 1);
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.hRow}>
          <View style={s.hLabelBox}>
            <View style={[s.dot, { backgroundColor: item.color }]} />
            <Text style={s.hLabel} numberOfLines={1}>{item.label}</Text>
          </View>
          <View style={s.hTrack}>
            <View style={[s.hFill, {
              width: `${Math.max((item.value / maxVal) * 100, 4)}%`,
              backgroundColor: item.color,
            }]} />
          </View>
          <Text style={s.hVal}>{typeof item.shortVal === 'string' ? item.shortVal : shortN(item.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function shortN(n) {
  if (!n && n !== 0) return '--';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

/* ─── Funnel Row ─── */
export function FunnelBar({ label, value, maxVal, color }) {
  const ratio = maxVal > 0 ? (value || 0) / maxVal : 0;
  return (
    <View style={s.funnelRow}>
      <Text style={s.funnelLabel}>{label}</Text>
      <View style={s.funnelTrack}>
        <View style={[s.funnelFill, { width: `${Math.max(ratio * 100, 5)}%`, backgroundColor: color }]}>
          <Text style={s.funnelText}>{shortN(value)}</Text>
        </View>
      </View>
    </View>
  );
}

/* ─── Rate Badge ─── */
export function RateBadge({ label, value, color }) {
  return (
    <View style={[s.rateBadge, { borderColor: rgba(color, 0.3) }]}>
      <Text style={[s.rateVal, { color }]}>{value}</Text>
      <Text style={s.rateLbl}>{label}</Text>
    </View>
  );
}

/* ─── Rank Row ─── */
export function RankRow({ index, title, subtitle, color }) {
  return (
    <View style={s.rankRow}>
      <View style={[s.rankBadge, index < 3 && { backgroundColor: rgba(color, 0.15) }]}>
        <Text style={[s.rankNum, index < 3 && { color }]}>
          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
        </Text>
      </View>
      <View style={s.rankInfo}>
        <Text style={s.rankTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.rankSub} numberOfLines={1}>{subtitle}</Text>
      </View>
    </View>
  );
}

/* ─── Stacked Bar ─── */
export function StackedBar({ segments }) {
  const total = segments.reduce((a, d) => a + (d.value || 0), 0) || 1;
  return (
    <View style={s.stackedBar}>
      {segments.map((seg, i) => (
        <View key={i} style={[s.stackedSeg, {
          width: `${Math.max((seg.value / total) * 100, 1)}%`,
          backgroundColor: seg.color,
        }]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: C.textSec, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  empty: { color: C.textMut, textAlign: 'center', paddingVertical: 16, fontSize: 12 },

  kpiItem: { width: '48%', backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.cardBorder },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { color: C.textMut, fontSize: 11 },
  kpiValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },

  barRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 2 },
  barCol: { alignItems: 'center', marginHorizontal: 1 },
  bar: { borderRadius: 2, minHeight: 2 },
  barLabels: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  axisLabel: { color: C.textMut, fontSize: 8, textAlign: 'center' },

  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  hLabelBox: { flexDirection: 'row', alignItems: 'center', width: 56 },
  hLabel: { color: C.textSec, fontSize: 11, marginLeft: 4 },
  hTrack: { flex: 1, height: 16, backgroundColor: C.surface, borderRadius: 4, overflow: 'hidden', marginHorizontal: 6 },
  hFill: { height: '100%', borderRadius: 4 },
  hVal: { color: C.text, fontSize: 11, fontWeight: '600', width: 40, textAlign: 'right' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  funnelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  funnelLabel: { color: C.textSec, fontSize: 11, width: 34 },
  funnelTrack: { flex: 1, height: 24, backgroundColor: C.surface, borderRadius: 6, overflow: 'hidden', marginHorizontal: 6 },
  funnelFill: { height: '100%', borderRadius: 6, justifyContent: 'center', paddingLeft: 8 },
  funnelText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  rateBadge: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  rateVal: { fontSize: 15, fontWeight: '800' },
  rateLbl: { color: C.textMut, fontSize: 9, marginTop: 2 },

  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankNum: { color: C.textMut, fontSize: 11, fontWeight: '700' },
  rankInfo: { flex: 1 },
  rankTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  rankSub: { color: C.textMut, fontSize: 10, marginTop: 2 },

  stackedBar: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', marginBottom: 10 },
  stackedSeg: { height: '100%' },
});
