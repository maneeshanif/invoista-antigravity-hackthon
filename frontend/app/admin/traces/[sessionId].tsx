import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react-native';
import { useApi } from '@/lib/useApi';
import type { TraceLog } from '@/lib/api';

function JsonViewer({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <ThemedText style={styles.jsonNull}>null</ThemedText>;
  return (
    <View style={styles.jsonContainer}>
      <ThemedText style={styles.jsonText}>{JSON.stringify(data, null, 2)}</ThemedText>
    </View>
  );
}

function TraceCard({ trace }: { trace: TraceLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard style={styles.traceCard}>
      {/* Header Row */}
      <TouchableOpacity style={styles.traceHeader} onPress={() => setExpanded((p) => !p)}>
        <View style={styles.stepBadge}>
          <ThemedText style={styles.stepBadgeText}>{trace.step}</ThemedText>
        </View>
        <View style={styles.traceHeaderContent}>
          <ThemedText style={styles.agentName}>{trace.agent_name}</ThemedText>
          {trace.tool_used && (
            <ThemedText style={styles.toolName}>🔧 {trace.tool_used}</ThemedText>
          )}
        </View>
        <View style={styles.traceHeaderRight}>
          {trace.duration_ms != null && (
            <View style={styles.durationChip}>
              <Clock size={10} color={Colors.dark.accent} />
              <ThemedText style={styles.durationText}>{trace.duration_ms}ms</ThemedText>
            </View>
          )}
          {expanded
            ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
            : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
          }
        </View>
      </TouchableOpacity>

      {/* Output Summary */}
      {trace.output_summary && (
        <ThemedText style={styles.summaryText}>{trace.output_summary}</ThemedText>
      )}

      {/* Expanded Payload */}
      {expanded && (
        <View style={styles.payloads}>
          <ThemedText style={styles.payloadLabel}>INPUT</ThemedText>
          <JsonViewer data={trace.input_payload} />

          <ThemedText style={[styles.payloadLabel, { marginTop: Spacing.md }]}>OUTPUT</ThemedText>
          <JsonViewer data={trace.output_payload} />
        </View>
      )}
    </GlassCard>
  );
}

export default function TraceDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { getSessionTrace } = useApi();

  const [traces, setTraces] = useState<TraceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSessionTrace(sessionId);
        setTraces(data.slice().sort((a, b) => a.step - b.step));
      } catch (e: any) {
        setError(e.message ?? 'Failed to load traces.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <ThemedText style={styles.loadingText}>Loading trace logs…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Session ID header */}
        <GlassCard style={styles.sessionIdCard}>
          <ThemedText style={styles.sessionIdLabel}>SESSION</ThemedText>
          <ThemedText style={styles.sessionIdValue} numberOfLines={1}>{sessionId}</ThemedText>
          <ThemedText style={styles.traceCount}>{traces.length} trace steps</ThemedText>
        </GlassCard>

        {error && (
          <GlassCard style={styles.errorBanner}>
            <AlertCircle size={16} color="#FF4B4B" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </GlassCard>
        )}

        {traces.length === 0 && !error ? (
          <ThemedText style={styles.emptyText}>No trace logs found for this session.</ThemedText>
        ) : (
          traces.map((trace) => <TraceCard key={trace.id} trace={trace} />)
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sessionIdCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
  },
  sessionIdLabel: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sessionIdValue: {
    fontSize: 12,
    fontFamily: Typography.fonts.medium,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  traceCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderColor: 'rgba(255,75,75,0.3)',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF4B4B',
    flex: 1,
    fontSize: Typography.sizes.sm,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  traceCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
  },
  traceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 243, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
  },
  traceHeaderContent: {
    flex: 1,
  },
  agentName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  toolName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  traceHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  durationText: {
    fontSize: 9,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.bold,
  },
  summaryText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  payloads: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  payloadLabel: {
    fontSize: 9,
    fontFamily: Typography.fonts.bold,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  jsonContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  jsonText: {
    fontSize: 10,
    color: '#10B981',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  jsonNull: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    padding: Spacing.xs,
  },
});
