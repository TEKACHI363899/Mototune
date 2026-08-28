import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Wrench,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { IBike } from '../../interfaces/bike';
import { MAINTENANCE_PARTS, MAINTENANCE_CATEGORIES } from '../../constants/garage';
import { COLORS } from '../../constants/colors';
import { normalizeMaintenanceStatus } from '../../services/bikeService';

interface IMaintenanceStatusProps {
  bikeObj: IBike;
  onOpenPartResetModal: (partId: string, partName: string) => void;
}

type HealthFilter = 'all' | 'danger' | 'warning' | 'safe';

export default function MaintenanceStatus({
  bikeObj,
  onOpenPartResetModal,
}: IMaintenanceStatusProps) {
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});

  const currentOdo = Math.max(0, Math.floor(bikeObj.odo) || 0);
  const normalizedMaintenance = useMemo(() => {
    return normalizeMaintenanceStatus(bikeObj.maintenance, bikeObj.lastOilChangeOdo);
  }, [bikeObj.maintenance, bikeObj.lastOilChangeOdo]);

  const partCalculations = useMemo(() => {
    return MAINTENANCE_PARTS.map((part) => {
      const lastService = Math.max(0, Math.floor(normalizedMaintenance[part.id] ?? 0));
      const kmPassed = Math.max(0, currentOdo - lastService);
      const safeInterval = Math.max(1, part.interval);
      const kmLeft = safeInterval - kmPassed;
      const progress = Math.min(Math.max((kmPassed / safeInterval) * 100, 0), 100);

      const isDanger = kmLeft <= 0;
      const isWarning = !isDanger && kmLeft <= safeInterval * 0.15;
      const isSafe = !isDanger && !isWarning;

      const barColor = isDanger ? COLORS.primary : isWarning ? COLORS.warning : COLORS.safe;

      return {
        part,
        lastService,
        kmPassed,
        kmLeft,
        progress: Number.isNaN(progress) ? 0 : progress,
        isDanger,
        isWarning,
        isSafe,
        barColor,
      };
    });
  }, [currentOdo, normalizedMaintenance]);

  const summary = useMemo(() => {
    let safeCount = 0;
    let warningCount = 0;
    let dangerCount = 0;

    partCalculations.forEach((item) => {
      if (item.isDanger) dangerCount++;
      else if (item.isWarning) warningCount++;
      else safeCount++;
    });

    return {
      total: partCalculations.length,
      safe: safeCount,
      warning: warningCount,
      danger: dangerCount,
    };
  }, [partCalculations]);

  const categories = useMemo(() => {
    return MAINTENANCE_CATEGORIES.filter((c) => c.key !== 'all');
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  const toggleCategory = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: isSearching ? prev[catKey] === false : !prev[catKey],
    }));
  };

  const togglePartExpand = (partId: string) => {
    setExpandedParts((prev) => ({
      ...prev,
      [partId]: !prev[partId],
    }));
  };

  const handleLongPressPart = (partId: string, partName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onOpenPartResetModal(partId, partName);
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Wrench size={18} color={COLORS.primary} />
          <Text style={styles.cardTitle}>TÌNH TRẠNG HAO MÒN</Text>
        </View>
        <Text style={styles.totalBadge}>{summary.total} hạng mục</Text>
      </View>

      {/* 4-State Minimal Health Filter Pills */}
      <View style={styles.filterPillsRow}>
        <TouchableOpacity
          style={[styles.filterPill, healthFilter === 'all' && styles.activeFilterAll]}
          onPress={() => setHealthFilter('all')}
          activeOpacity={0.7}
        >
          <Layers size={13} color={healthFilter === 'all' ? '#FFFFFF' : COLORS.textDim} />
          <Text style={[styles.filterPillText, healthFilter === 'all' && styles.activeFilterTextAll]}>
            Tất cả
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, healthFilter === 'safe' && styles.activeFilterSafe]}
          onPress={() => setHealthFilter(healthFilter === 'safe' ? 'all' : 'safe')}
          activeOpacity={0.7}
        >
          <CheckCircle2 size={13} color={COLORS.safe} />
          <Text
            style={[
              styles.filterPillText,
              healthFilter === 'safe' && { color: COLORS.safe, fontWeight: '700' },
            ]}
          >
            Tốt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, healthFilter === 'warning' && styles.activeFilterWarning]}
          onPress={() => setHealthFilter(healthFilter === 'warning' ? 'all' : 'warning')}
          activeOpacity={0.7}
        >
          <AlertCircle size={13} color={COLORS.warning} />
          <Text
            style={[
              styles.filterPillText,
              healthFilter === 'warning' && { color: COLORS.warning, fontWeight: '700' },
            ]}
          >
            Sắp hạn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, healthFilter === 'danger' && styles.activeFilterDanger]}
          onPress={() => setHealthFilter(healthFilter === 'danger' ? 'all' : 'danger')}
          activeOpacity={0.7}
        >
          <AlertTriangle size={13} color={COLORS.primary} />
          <Text
            style={[
              styles.filterPillText,
              healthFilter === 'danger' && { color: COLORS.primary, fontWeight: '700' },
            ]}
          >
            Quá hạn
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Filter Bar */}
      <View style={styles.searchBar}>
        <Search size={15} color={COLORS.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm phụ tùng, hạng mục..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color={COLORS.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Accordion Category Rows */}
      <View style={styles.accordionList}>
        {categories.map((cat) => {
          const CatIcon = cat.icon;
          const allCatParts = partCalculations.filter((p) => p.part.category === cat.key);
          const catDanger = allCatParts.filter((p) => p.isDanger).length;
          const catWarning = allCatParts.filter((p) => p.isWarning).length;

          const query = searchQuery.trim().toLowerCase();
          const catFilteredParts = allCatParts.filter((item) => {
            let matchHealth = true;
            if (healthFilter === 'danger') matchHealth = item.isDanger;
            else if (healthFilter === 'warning') matchHealth = item.isWarning;
            else if (healthFilter === 'safe') matchHealth = item.isSafe;

            const matchSearch =
              query === '' ||
              item.part.name.toLowerCase().includes(query) ||
              (item.part.description?.toLowerCase().includes(query) ?? false);

            return matchHealth && matchSearch;
          });

          const hasMatches = catFilteredParts.length > 0;
          const isExpanded = isSearching
            ? hasMatches && expandedCategories[cat.key] !== false
            : !!expandedCategories[cat.key];

          const isHighlighted = healthFilter !== 'all' && hasMatches;
          const isDimmed = healthFilter !== 'all' && !hasMatches;

          const pillText =
            catDanger > 0
              ? `${allCatParts.length} món • ${catDanger} quá hạn`
              : catWarning > 0
              ? `${allCatParts.length} món • ${catWarning} sắp hạn`
              : `${allCatParts.length} món`;

          const pillColor =
            catDanger > 0
              ? COLORS.primary
              : catWarning > 0
              ? COLORS.warning
              : COLORS.textDim;

          return (
            <View
              key={cat.key}
              style={[
                styles.accordionCard,
                isHighlighted && { borderColor: pillColor },
                isDimmed && { opacity: 0.5 },
              ]}
            >
              {/* Category Accordion Header */}
              <TouchableOpacity
                style={styles.categoryAccordionHeader}
                onPress={() => toggleCategory(cat.key)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View
                    style={[
                      styles.categoryIconWrap,
                      { backgroundColor: `${pillColor}18` },
                    ]}
                  >
                    <CatIcon size={15} color={pillColor} />
                  </View>
                  <Text style={styles.categoryTitleText}>{cat.label}</Text>
                </View>

                <View style={styles.categoryHeaderRight}>
                  <View
                    style={[
                      styles.categorySummaryPill,
                      {
                        backgroundColor: `${pillColor}15`,
                        borderColor: `${pillColor}40`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categorySummaryPillText,
                        { color: pillColor },
                      ]}
                    >
                      {pillText}
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color={COLORS.textDim} />
                  ) : (
                    <ChevronDown size={16} color={COLORS.textDim} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Category Expanded Body */}
              {isExpanded && (
                <View style={styles.categoryBody}>
                  {catFilteredParts.length === 0 ? (
                    <View style={styles.categoryEmptyBox}>
                      <Text style={styles.categoryEmptyText}>
                        Không có linh kiện phù hợp với bộ lọc.
                      </Text>
                    </View>
                  ) : (
                    catFilteredParts.map(
                      ({
                        part,
                        lastService,
                        kmLeft,
                        progress,
                        isDanger,
                        isWarning,
                        barColor,
                      }) => {
                        const Icon = part.icon;
                        const isPartExpanded = !!expandedParts[part.id];
                        const statusText = isDanger
                          ? `Quá ${Math.abs(kmLeft).toLocaleString('vi-VN')} km`
                          : isWarning
                          ? `Còn ${kmLeft.toLocaleString('vi-VN')} km`
                          : `Còn ${kmLeft.toLocaleString('vi-VN')} km`;

                        return (
                          <View key={part.id} style={styles.partCard}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => togglePartExpand(part.id)}
                              onLongPress={() => handleLongPressPart(part.id, part.name)}
                              style={styles.partTouchArea}
                            >
                              <View style={styles.partTopRow}>
                                <View style={styles.partTitleGroup}>
                                  <View
                                    style={[
                                      styles.iconWrapper,
                                      { backgroundColor: `${barColor}15` },
                                    ]}
                                  >
                                    <Icon size={14} color={barColor} />
                                  </View>
                                  <View style={styles.nameMetaBox}>
                                    <Text style={styles.partNameText} numberOfLines={1}>
                                      {part.name}
                                    </Text>
                                    <Text style={styles.partDinhKyText}>
                                      Định kỳ {part.interval.toLocaleString('vi-VN')} km
                                    </Text>
                                  </View>
                                </View>

                                <View
                                  style={[
                                    styles.statusPill,
                                    {
                                      backgroundColor: `${barColor}18`,
                                      borderColor: `${barColor}50`,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusPillText,
                                      { color: barColor },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {statusText}
                                  </Text>
                                </View>
                              </View>

                              {/* 3px Ultra-thin Progress Track */}
                              <View style={styles.progressTrack}>
                                <View
                                  style={[
                                    styles.progressFill,
                                    {
                                      width: `${progress}%`,
                                      backgroundColor: barColor,
                                    },
                                  ]}
                                />
                              </View>
                            </TouchableOpacity>

                            {/* Expandable Details Area (Decoupled from main touch target) */}
                            {isPartExpanded && (
                              <View style={styles.expandedDetailBox}>
                                {part.description ? (
                                  <Text style={styles.partDescriptionText}>
                                    {part.description}
                                  </Text>
                                ) : null}

                                <View style={styles.partBottomRow}>
                                  <Text style={styles.lastServiceText}>
                                    Bảo dưỡng gần nhất: {lastService.toLocaleString('vi-VN')} km
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => onOpenPartResetModal(part.id, part.name)}
                                    activeOpacity={0.7}
                                  >
                                    <RefreshCw size={11} color="#E5E5E5" />
                                    <Text style={styles.actionBtnText}>
                                      Ghi nhận thay mới
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      }
                    )
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  totalBadge: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#161616',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  filterPillText: {
    fontSize: 11,
    color: COLORS.textDim,
    fontWeight: '600',
  },
  activeFilterAll: {
    borderColor: '#666666',
    backgroundColor: '#262626',
  },
  activeFilterTextAll: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeFilterSafe: {
    borderColor: COLORS.safe,
    backgroundColor: '#12261A',
  },
  activeFilterWarning: {
    borderColor: COLORS.warning,
    backgroundColor: '#2B2212',
  },
  activeFilterDanger: {
    borderColor: COLORS.primary,
    backgroundColor: '#2A1416',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 12,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 8,
    fontSize: 12,
  },
  accordionList: {
    gap: 8,
  },
  accordionCard: {
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#282828',
    overflow: 'hidden',
  },
  categoryAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categorySummaryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  categorySummaryPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBody: {
    borderTopWidth: 1,
    borderTopColor: '#222222',
    padding: 8,
    backgroundColor: '#0F0F0F',
    gap: 6,
  },
  categoryEmptyBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryEmptyText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  partCard: {
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242424',
  },
  partTouchArea: {
    width: '100%',
  },
  partTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  partTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nameMetaBox: {
    flex: 1,
    minWidth: 0,
  },
  partNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  partDinhKyText: {
    color: '#666666',
    fontSize: 10,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#262626',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 7,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  expandedDetailBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#242424',
    marginTop: 8,
    paddingTop: 8,
  },
  partDescriptionText: {
    color: '#8A8A8A',
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  partBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastServiceText: {
    color: '#737373',
    fontSize: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionBtnText: {
    color: '#E5E5E5',
    fontSize: 10,
    fontWeight: '600',
  },
});



