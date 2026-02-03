import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useNavigate } from 'react-router-dom';
import { NavigationAxes, TagFilter, EventCard } from '../components';
import type { CategoryNavigationAxis, NavigationFilterState, Tag, Event } from '../types';

/**
 * P-005: イベント一覧ページ
 *
 * 機能:
 * - 3軸ナビゲーション（イベント種類 → 開催月 → 開催地）
 * - タグフィルター
 * - イベントカード表示
 */
export const EventsListPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [filters, setFilters] = useState<NavigationFilterState>({
    eventType: 'すべて',
    month: '2025年2月',
    location: 'すべて',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(['1']); // 受付中をデフォルト選択

  // モックデータ - ナビゲーション軸
  const navigationAxes: CategoryNavigationAxis[] = [
    {
      id: '1',
      categoryType: 'events' as any,
      axisName: 'イベント種類',
      axisKey: 'eventType',
      order: 1,
      axisType: 'select' as any,
      options: ['すべて', '音楽フェス', '車イベント', 'セミナー', '展示会'],
      displayType: 'button' as any,
    },
    {
      id: '2',
      categoryType: 'events' as any,
      axisName: '開催月',
      axisKey: 'month',
      order: 2,
      axisType: 'select' as any,
      options: ['すべて', '2025年1月', '2025年2月', '2025年3月', '2025年4月'],
      displayType: 'button' as any,
    },
    {
      id: '3',
      categoryType: 'events' as any,
      axisName: '開催地',
      axisKey: 'location',
      order: 3,
      axisType: 'select' as any,
      options: ['すべて', '東京', '大阪', '名古屋', '福岡'],
      displayType: 'button' as any,
    },
  ];

  // モックデータ - タグ
  const tags: Tag[] = [
    { id: '1', name: '受付中' },
    { id: '2', name: '残りわずか' },
    { id: '3', name: '早割' },
    { id: '4', name: '学割' },
  ];

  // モックデータ - イベント
  const events: Event[] = [
    {
      id: '1',
      name: '東京オートサロン2025',
      description: '最新の車カスタム・チューニングカーが集結する国内最大級の車イベント',
      price: 3500,
      images: [],
      startDate: new Date('2025-02-15'),
      endDate: new Date('2025-02-17'),
      location: '東京ビッグサイト',
      capacity: 5000,
      remainingCapacity: 2000,
      eventType: '車イベント',
      tags: [tags[0]],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'サマーソニック2025',
      description: '国内外のトップアーティストが出演する夏の音楽フェスティバル',
      price: 18000,
      images: [],
      startDate: new Date('2025-08-20'),
      endDate: new Date('2025-08-21'),
      location: 'ZOZOマリンスタジアム',
      capacity: 30000,
      remainingCapacity: 3000,
      eventType: '音楽フェス',
      tags: [tags[1]],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'Web開発セミナー',
      description: '最新のWeb開発技術を学べる実践的なセミナー',
      price: 5000,
      images: [],
      startDate: new Date('2025-02-28'),
      endDate: new Date('2025-02-28'),
      location: 'オンライン開催',
      capacity: 500,
      remainingCapacity: 300,
      eventType: 'セミナー',
      tags: [tags[0]],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      name: '大阪モーターショー',
      description: '国内外の最新モデルが一堂に会する自動車展示会',
      price: 2800,
      images: [],
      startDate: new Date('2025-03-10'),
      endDate: new Date('2025-03-12'),
      location: 'インテックス大阪',
      capacity: 10000,
      remainingCapacity: 7000,
      eventType: '展示会',
      tags: [tags[0]],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const handleFilterChange = (axisKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [axisKey]: value }));
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleEventClick = () => {
    // TODO: 実際のイベントデータが実装されたらイベント詳細ページに遷移
    // navigate(`/events/${eventId}`);
    alert('イベント詳細ページは現在準備中です');
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 10 }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* パンくずリスト */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Breadcrumbs>
            <Link underline="hover" color="primary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              トップ
            </Link>
            <Typography color="text.primary">イベント一覧</Typography>
          </Breadcrumbs>
        </Paper>

        {/* ページタイトル */}
        <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
            🎫 イベント一覧
          </Typography>
          <Typography variant="body1" color="text.secondary">
            音楽フェス、車イベント、セミナーなど多様なイベント情報
          </Typography>
        </Paper>

        {/* ナビゲーション軸 */}
        <NavigationAxes axes={navigationAxes} filters={filters} onFilterChange={handleFilterChange} />

        {/* タグフィルター */}
        <TagFilter tags={tags} selectedTags={selectedTags} onTagToggle={handleTagToggle} />

        {/* イベントカードグリッド */}
        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid xs={12} sm={6} md={4} lg={3} key={event.id}>
              <EventCard event={event} onClick={() => handleEventClick()} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default EventsListPage;
