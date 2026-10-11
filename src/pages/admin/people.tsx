// src/pages/admin/people.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import AdminRoute from '@/components/ProtectedRoute/AdminRoute';
import AdminLayout from '@/components/Layout/AdminLayout';
import BackToTop from '@/components/UI/BackToTop';
import { showCinemaAlert } from '@/components/UI/CinemaAlert';
import {
  FaUserTie,
  FaUsers,
  FaVideo,
  FaPlus,
  FaSearch,
  FaTimes,
  FaPen,
  FaTrash,
  FaCheckCircle,
  FaTrophy,
  FaFilm
} from 'react-icons/fa';
import styles from '@/styles/AdminPeople.module.css';

import PeopleAwardsDrawer, { PersonItem, AwardItem } from '@/components/Admin/People/PeopleAwardsDrawer';
import PeopleFormModal from '@/components/Admin/People/PeopleFormModal';
import PeopleDeleteModal from '@/components/Admin/People/PeopleDeleteModal';

type PeopleTab = 'actors' | 'directors';

const INITIAL_ACTORS: PersonItem[] = [
  {
    id: 'act-1',
    name: 'Cillian Murphy',
    originalName: 'Cillian Murphy',
    slug: 'cillian-murphy',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/iL8QvW1pL29w69C8q73f4Lz6s5.jpg',
    nationality: 'Ireland',
    birthYear: 1976,
    bio: 'Nam diễn viên nổi tiếng người Ireland, được biết đến qua các vai diễn trong Oppenheimer, Peaky Blinders, Inception.',
    isVerified: true,
    isActive: true,
    movieCount: 24,
    awards: [
      { id: 'aw-1', name: 'Oscar', year: 2024, category: 'Nam chính xuất sắc nhất', movieName: 'Oppenheimer' },
      { id: 'aw-2', name: 'Quả Cầu Vàng', year: 2024, category: 'Nam diễn viên chính xuất sắc', movieName: 'Oppenheimer' },
      { id: 'aw-3', name: 'BAFTA', year: 2024, category: 'Nam diễn viên chính xuất sắc', movieName: 'Oppenheimer' }
    ]
  },
  {
    id: 'act-2',
    name: 'Song Joong Ki',
    originalName: '송중기',
    slug: 'song-joong-ki',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/98h063WzI9Xl7x6bA7hZ8zR3rP.jpg',
    nationality: 'Hàn Quốc',
    birthYear: 1985,
    bio: 'Ngôi sao hàng đầu làn sóng Hallyu, nam chính trong Vincenzo, Hậu Duệ Mặt Trời, Cậu Út Nhà Tài Phiệt.',
    isVerified: true,
    isActive: true,
    movieCount: 18,
    awards: [
      { id: 'aw-4', name: 'Baeksang Arts Awards', year: 2021, category: 'Nam diễn viên được yêu thích nhất', movieName: 'Vincenzo' },
      { id: 'aw-5', name: 'APAN Star Awards', year: 2022, category: 'Daesang Diễn xuất', movieName: 'Vincenzo' }
    ]
  },
  {
    id: 'act-3',
    name: 'Margot Robbie',
    originalName: 'Margot Robbie',
    slug: 'margot-robbie',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/euDPyqLnuwaWMDoAUuq5NmNTv.jpg',
    nationality: 'Úc',
    birthYear: 1990,
    bio: 'Nữ diễn viên và nhà sản xuất tài năng, nổi tiếng với Barbie, Babylon, The Wolf of Wall Street.',
    isVerified: true,
    isActive: true,
    movieCount: 32,
    awards: [
      { id: 'aw-6', name: 'Critics Choice Awards', year: 2024, category: 'Nữ diễn viên xuất sắc', movieName: 'Barbie' },
      { id: 'aw-7', name: 'AACTA International Award', year: 2020, category: 'Nữ phụ xuất sắc', movieName: 'Bombshell' }
    ]
  },
  {
    id: 'act-4',
    name: 'Leonardo DiCaprio',
    originalName: 'Leonardo DiCaprio',
    slug: 'leonardo-dicaprio',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg',
    nationality: 'Mỹ',
    birthYear: 1974,
    bio: 'Một trong những nam tài tử vĩ đại nhất Hollywood thế hệ mới với Titanic, Inception, The Revenant.',
    isVerified: true,
    isActive: true,
    movieCount: 39,
    awards: [
      { id: 'aw-8', name: 'Oscar', year: 2016, category: 'Nam chính xuất sắc nhất', movieName: 'The Revenant' },
      { id: 'aw-9', name: 'Quả Cầu Vàng', year: 2016, category: 'Nam diễn viên phim chính kịch', movieName: 'The Revenant' }
    ]
  },
  {
    id: 'act-5',
    name: 'Ninh Dương Lan Ngọc',
    originalName: 'Ninh Dương Lan Ngọc',
    slug: 'ninh-duong-lan-ngoc',
    avatarUrl: '',
    nationality: 'Việt Nam',
    birthYear: 1990,
    bio: 'Ngọc nữ điện ảnh Việt Nam, ghi dấu ấn qua Cánh Đồng Bất Tận, Cua Lại Vợ Bầu, Gái Già Lắm Chiêu.',
    isVerified: true,
    isActive: true,
    movieCount: 16,
    awards: [
      { id: 'aw-10', name: 'Cánh Diều Vàng', year: 2011, category: 'Nữ diễn viên chính xuất sắc', movieName: 'Cánh Đồng Bất Tận' }
    ]
  },
  {
    id: 'act-6',
    name: 'Tom Holland',
    originalName: 'Tom Holland',
    slug: 'tom-holland',
    avatarUrl: '',
    nationality: 'Vương Quốc Anh',
    birthYear: 1996,
    bio: 'Chàng Người Nhện Peter Parker trẻ trung của Vũ trụ Điện ảnh Marvel (MCU).',
    isVerified: false,
    isActive: true,
    movieCount: 15,
    awards: [
      { id: 'aw-11', name: 'BAFTA Rising Star', year: 2017, category: 'Ngôi sao đang lên', movieName: 'Spider-Man' }
    ]
  },
  {
    id: 'act-7',
    name: 'Song Kang',
    originalName: '송강',
    slug: 'song-kang',
    avatarUrl: '',
    nationality: 'Hàn Quốc',
    birthYear: 1994,
    bio: 'Nam diễn viên thế hệ mới nổi tiếng qua các tác phẩm Sweet Home, My Demon, Nevertheless.',
    isVerified: false,
    isActive: true,
    movieCount: 10,
    awards: []
  }
];

const INITIAL_DIRECTORS: PersonItem[] = [
  {
    id: 'dir-1',
    name: 'Christopher Nolan',
    originalName: 'Christopher Nolan',
    slug: 'christopher-nolan',
    avatarUrl: 'https://image.tmdb.org/t/p/w200/xuAIuYSmsUzKlUMBFGVZaWsY342.jpg',
    nationality: 'Anh / Mỹ',
    birthYear: 1970,
    bio: 'Bậc thầy đạo diễn với phong cách kể chuyện phi tuyến tính, đạo diễn của Oppenheimer, Interstellar, The Dark Knight.',
    isVerified: true,
    isActive: true,
    movieCount: 12,
    awards: [
      { id: 'awd-1', name: 'Oscar', year: 2024, category: 'Đạo diễn xuất sắc nhất', movieName: 'Oppenheimer' },
      { id: 'awd-2', name: 'Oscar', year: 2024, category: 'Phim hay nhất', movieName: 'Oppenheimer' },
      { id: 'awd-3', name: 'DGA Award', year: 2024, category: 'Thành tựu đạo diễn điện ảnh', movieName: 'Oppenheimer' }
    ]
  },
  {
    id: 'dir-2',
    name: 'Denis Villeneuve',
    originalName: 'Denis Villeneuve',
    slug: 'denis-villeneuve',
    avatarUrl: '',
    nationality: 'Canada',
    birthYear: 1967,
    bio: 'Đạo diễn hàng đầu dòng phim khoa học viễn tưởng đương đại: Dune 1 & 2, Blade Runner 2049, Arrival.',
    isVerified: true,
    isActive: true,
    movieCount: 11,
    awards: [
      { id: 'awd-4', name: 'Hugo Awards', year: 2022, category: 'Trình diễn kịch bản xuất sắc', movieName: 'Dune: Part One' }
    ]
  },
  {
    id: 'dir-3',
    name: 'Bong Joon-ho',
    originalName: '봉준호',
    slug: 'bong-joon-ho',
    avatarUrl: '',
    nationality: 'Hàn Quốc',
    birthYear: 1969,
    bio: 'Đạo diễn làm nên lịch sử điện ảnh châu Á với kiệt tác Ký Sinh Trùng (Parasite), Memories of Murder.',
    isVerified: true,
    isActive: true,
    movieCount: 9,
    awards: [
      { id: 'awd-5', name: 'Oscar', year: 2020, category: 'Đạo diễn xuất sắc nhất', movieName: 'Parasite' },
      { id: 'awd-6', name: 'Cành Cọ Vàng (Cannes)', year: 2019, category: 'Palme d\'Or', movieName: 'Parasite' }
    ]
  },
  {
    id: 'dir-4',
    name: 'Quentin Tarantino',
    originalName: 'Quentin Tarantino',
    slug: 'quentin-tarantino',
    avatarUrl: '',
    nationality: 'Mỹ',
    birthYear: 1963,
    bio: 'Vị đạo diễn quái kiệt với lối thoại đặc sắc và bạo lực phong cách: Pulp Fiction, Django Unchained, Kill Bill.',
    isVerified: true,
    isActive: true,
    movieCount: 10,
    awards: [
      { id: 'awd-7', name: 'Oscar', year: 1995, category: 'Kịch bản gốc xuất sắc', movieName: 'Pulp Fiction' }
    ]
  },
  {
    id: 'dir-5',
    name: 'Victor Vũ',
    originalName: 'Victor Vũ',
    slug: 'victor-vu',
    avatarUrl: '',
    nationality: 'Việt Nam / Mỹ',
    birthYear: 1975,
    bio: 'Đạo diễn tiên phong đưa chất lượng điện ảnh thương mại Việt Nam vươn tầm: Mắt Biếc, Tôi Thấy Hoa Vàng Trên Cỏ Xanh.',
    isVerified: true,
    isActive: true,
    movieCount: 14,
    awards: [
      { id: 'awd-8', name: 'Bông Sen Vàng', year: 2015, category: 'Đạo diễn xuất sắc nhất', movieName: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh' }
    ]
  }
];

export default function PeopleAdminPage() {
  const [activeTab, setActiveTab] = useState<PeopleTab>('actors');

  // Collections
  const [actors, setActors] = useState<PersonItem[]>(INITIAL_ACTORS);
  const [directors, setDirectors] = useState<PersonItem[]>(INITIAL_DIRECTORS);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [verifyFilter, setVerifyFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  // Modal & Drawer states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<PersonItem | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPersonForAwards, setSelectedPersonForAwards] = useState<PersonItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<PersonItem | null>(null);

  // Current list
  const currentList = useMemo(() => {
    return activeTab === 'actors' ? actors : directors;
  }, [activeTab, actors, directors]);

  // Filtered list
  const filteredList = useMemo(() => {
    return currentList.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (p.originalName && p.originalName.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        p.slug.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (p.nationality && p.nationality.toLowerCase().includes(searchTerm.toLowerCase().trim()));

      const matchStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? p.isActive :
        !p.isActive;

      const matchVerify =
        verifyFilter === 'all' ? true :
        verifyFilter === 'verified' ? p.isVerified :
        !p.isVerified;

      return matchSearch && matchStatus && matchVerify;
    });
  }, [currentList, searchTerm, statusFilter, verifyFilter]);

  const currentTabLabel = activeTab === 'actors' ? 'Diễn Viên' : 'Đạo Diễn';

  // Toggle Verified Badge
  const handleToggleVerify = (person: PersonItem) => {
    const nextVerify = !person.isVerified;
    const updater = (list: PersonItem[]) =>
      list.map(p => p.id === person.id ? { ...p, isVerified: nextVerify } : p);

    if (activeTab === 'actors') setActors(updater);
    else setDirectors(updater);

    showCinemaAlert(
      `Đã ${nextVerify ? 'cấp tích xanh xác minh (Verified)' : 'gỡ huy hiệu xác minh'} cho ${person.name}!`,
      nextVerify ? 'cinema' : 'warning'
    );
  };

  // Toggle Active Status
  const handleToggleStatus = (person: PersonItem) => {
    const nextStatus = !person.isActive;
    const updater = (list: PersonItem[]) =>
      list.map(p => p.id === person.id ? { ...p, isActive: nextStatus } : p);

    if (activeTab === 'actors') setActors(updater);
    else setDirectors(updater);

    showCinemaAlert(
      `Đã ${nextStatus ? 'kích hoạt' : 'tạm ẩn'} hồ sơ ${person.name}!`,
      nextStatus ? 'cinema' : 'warning'
    );
  };

  // Save Person (Create / Update)
  const handleSavePerson = (personData: Partial<PersonItem>) => {
    const isEdit = !!personData.id;

    const updater = (prev: PersonItem[]): PersonItem[] => {
      if (isEdit) {
        return prev.map(p => p.id === personData.id ? { ...p, ...personData } as PersonItem : p);
      } else {
        const newPerson: PersonItem = {
          id: `${activeTab.slice(0, 3)}-${Date.now()}`,
          name: personData.name || '',
          originalName: personData.originalName || '',
          slug: personData.slug || '',
          avatarUrl: personData.avatarUrl || '',
          nationality: personData.nationality || '',
          birthYear: personData.birthYear,
          bio: personData.bio || '',
          isVerified: personData.isVerified ?? false,
          isActive: personData.isActive ?? true,
          movieCount: 0,
          awards: []
        };
        return [newPerson, ...prev];
      }
    };

    if (activeTab === 'actors') setActors(updater);
    else setDirectors(updater);

    showCinemaAlert(
      `${isEdit ? 'Cập nhật' : 'Thêm mới'} ${currentTabLabel.toLowerCase()} "${personData.name}" thành công!`,
      'cinema'
    );
  };

  // Update Awards from Drawer
  const handleUpdateAwards = (personId: string, updatedAwards: AwardItem[]) => {
    const updater = (list: PersonItem[]) =>
      list.map(p => p.id === personId ? { ...p, awards: updatedAwards } : p);

    if (activeTab === 'actors') setActors(updater);
    else setDirectors(updater);

    if (selectedPersonForAwards && selectedPersonForAwards.id === personId) {
      setSelectedPersonForAwards({ ...selectedPersonForAwards, awards: updatedAwards });
    }
  };

  // Delete Person
  const handleConfirmDelete = () => {
    if (!personToDelete) return;
    const id = personToDelete.id;

    const remover = (prev: PersonItem[]) => prev.filter(p => p.id !== id);
    if (activeTab === 'actors') setActors(remover);
    else setDirectors(remover);

    showCinemaAlert(`Đã xóa hồ sơ ${currentTabLabel.toLowerCase()} "${personToDelete.name}"`, 'warning');
    setPersonToDelete(null);
  };

  return (
    <AdminRoute>
      <AdminLayout>
        <Head>
          <title>Quản Lý Diễn Viên & Đạo Diễn - Movie Admin Studio</title>
        </Head>

        <div className={styles.pageContainer}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconBox}>
                <FaUserTie />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Trung Tâm Quản Lý Nhân Sự (People Hub)</h1>
                <p className={styles.headerSubtitle}>
                  Quản lý hồ sơ diễn viên, đạo diễn, cấp tích xanh xác minh và hồ sơ giải thưởng nghệ thuật
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.primaryAddBtn}
                onClick={() => {
                  setFormInitialData(null);
                  setIsFormModalOpen(true);
                }}
              >
                <FaPlus />
                <span>Thêm {currentTabLabel}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'actors' ? styles.tabItemActive : ''}`}
              onClick={() => { setActiveTab('actors'); setSearchTerm(''); }}
            >
              <FaUsers />
              <span>Diễn Viên (Actors)</span>
              <span className={styles.tabBadge}>{actors.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'directors' ? styles.tabItemActive : ''}`}
              onClick={() => { setActiveTab('directors'); setSearchTerm(''); }}
            >
              <FaVideo />
              <span>Đạo Diễn (Directors)</span>
              <span className={styles.tabBadge}>{directors.length}</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Tìm ${currentTabLabel.toLowerCase()} theo tên, tên gốc hoặc slug...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa tìm kiếm"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className={styles.filterControls}>
              <select
                className={styles.filterSelect}
                value={verifyFilter}
                onChange={(e) => setVerifyFilter(e.target.value as any)}
              >
                <option value="all">Tất cả xác minh</option>
                <option value="verified">Đã có tích xanh</option>
                <option value="unverified">Chưa xác minh</option>
              </select>

              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ẩn</option>
              </select>
            </div>
          </div>

          {/* Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>{currentTabLabel}</th>
                    <th style={{ width: '15%' }}>Quốc Tịch & Tuổi</th>
                    <th style={{ width: '14%' }}>Tác Phẩm</th>
                    <th style={{ width: '18%' }}>Hồ Sơ Giải Thưởng</th>
                    <th style={{ width: '11%' }}>Trạng Thái</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className={styles.emptyState}>
                          <div className={styles.emptyIcon}>
                            <FaUserTie />
                          </div>
                          <p className={styles.emptyText}>
                            Không tìm thấy {currentTabLabel.toLowerCase()} nào phù hợp với điều kiện lọc
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((person) => (
                      <tr key={person.id} className={styles.tableRow}>
                        {/* Profile Info */}
                        <td>
                          <div className={styles.personCell}>
                            <div className={styles.avatarWrapper}>
                              {person.avatarUrl ? (
                                <img
                                  src={person.avatarUrl}
                                  alt={person.name}
                                  className={styles.avatarImg}
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className={styles.avatarFallback}>
                                  {person.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className={styles.personMeta}>
                              <div className={styles.personNameRow}>
                                <span className={styles.personName}>{person.name}</span>
                                <button
                                  type="button"
                                  className={styles.verifyBadgeInteractive}
                                  title={person.isVerified ? 'Tài khoản đã xác thực (Bấm để gỡ)' : 'Chưa xác thực (Bấm để cấp tích xanh)'}
                                  onClick={() => handleToggleVerify(person)}
                                >
                                  <FaCheckCircle className={person.isVerified ? styles.verifiedActive : styles.verifiedInactive} />
                                </button>
                              </div>
                              <span className={styles.personSub}>
                                {person.originalName && `${person.originalName} • `}
                                /{person.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Nationality & Age */}
                        <td>
                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <div>{person.nationality || '—'}</div>
                            <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>
                              {person.birthYear ? `Sinh năm ${person.birthYear}` : ''}
                            </div>
                          </div>
                        </td>

                        {/* Movies Count */}
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            color: '#cbd5e1',
                            background: 'rgba(255,255,255,0.06)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px'
                          }}>
                            <FaFilm style={{ color: '#e50914', fontSize: '0.72rem' }} />
                            <span>{person.movieCount} phim</span>
                          </span>
                        </td>

                        {/* Awards Trigger */}
                        <td>
                          <button
                            type="button"
                            className={`${styles.awardsBtn} ${person.awards.length > 0 ? styles.awardsBtnActive : ''}`}
                            onClick={() => {
                              setSelectedPersonForAwards(person);
                              setIsDrawerOpen(true);
                            }}
                          >
                            <FaTrophy style={{ color: person.awards.length > 0 ? '#f59e0b' : '#9ca3af' }} />
                            <span>{person.awards.length} giải thưởng</span>
                          </button>
                        </td>

                        {/* Status Toggle */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={person.isActive}
                                onChange={() => handleToggleStatus(person)}
                              />
                              <span className={styles.toggleSlider}></span>
                            </label>
                            <span className={`${styles.statusText} ${person.isActive ? styles.statusActive : styles.statusInactive}`}>
                              {person.isActive ? 'Bật' : 'Ẩn'}
                            </span>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td>
                          <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={styles.editBtn}
                              title={`Chỉnh sửa ${person.name}`}
                              onClick={() => {
                                setFormInitialData(person);
                                setIsFormModalOpen(true);
                              }}
                            >
                              <FaPen />
                            </button>
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              title={`Xóa ${person.name}`}
                              onClick={() => {
                                setPersonToDelete(person);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Awards Drawer */}
        <PeopleAwardsDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedPersonForAwards(null);
          }}
          person={selectedPersonForAwards}
          onUpdateAwards={handleUpdateAwards}
        />

        {/* Form Modal */}
        <PeopleFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSavePerson}
          initialData={formInitialData}
          type={activeTab}
        />

        {/* Delete Modal */}
        <PeopleDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          personName={personToDelete?.name || ''}
          type={activeTab}
        />

        <BackToTop />
      </AdminLayout>
    </AdminRoute>
  );
}
