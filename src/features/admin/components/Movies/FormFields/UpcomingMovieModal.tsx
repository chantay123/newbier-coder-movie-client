import React, { useState } from 'react';
import {
  FaCalendarAlt, FaClock, FaTimes, FaCheck,
  FaThumbtack, FaTrash, FaEdit, FaSlidersH
} from 'react-icons/fa';
import styles from '@/styles/AdminAddMovie.module.css';
import {
  MOVIE_FORM_I18N,
  ReleaseDescTemplate,
  PRESET_RELEASE_DESC_TEMPLATES
} from '@/config/addMovieConfig';
import { showCinemaAlert } from '@/features/shared/components/UI/CinemaAlert';

interface UpcomingMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseDateTime: string;
  setReleaseDateTime: (val: string) => void;
  releaseDescription: string;
  setReleaseDescription: (val: string) => void;
  autoSwitchStatus: boolean;
  setAutoSwitchStatus: (val: boolean) => void;
  targetStatusAfterRelease: 'ongoing' | 'completed';
  setTargetStatusAfterRelease: (val: 'ongoing' | 'completed') => void;
  countdownEnabled: boolean;
  setCountdownEnabled: (val: boolean) => void;
}

export const UpcomingMovieModal: React.FC<UpcomingMovieModalProps> = ({
  isOpen,
  onClose,
  releaseDateTime,
  setReleaseDateTime,
  releaseDescription,
  setReleaseDescription,
  autoSwitchStatus,
  setAutoSwitchStatus,
  targetStatusAfterRelease,
  setTargetStatusAfterRelease,
  countdownEnabled,
  setCountdownEnabled
}) => {
  // Preset templates state
  const [releaseDescTemplates, setReleaseDescTemplates] = useState<ReleaseDescTemplate[]>(PRESET_RELEASE_DESC_TEMPLATES);
  const [newReleaseDescText, setNewReleaseDescText] = useState('');
  const [newReleaseDescPinned, setNewReleaseDescPinned] = useState(true);
  const [isManagingReleaseDesc, setIsManagingReleaseDesc] = useState(false);
  const [editingReleaseDescId, setEditingReleaseDescId] = useState<string | null>(null);
  const [editingReleaseDescText, setEditingReleaseDescText] = useState('');

  if (!isOpen) return null;

  // Quick date adjust handler (+N days)
  const addDaysToRelease = (days: number) => {
    const baseDate = releaseDateTime ? new Date(releaseDateTime) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatted = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}T${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}`;
    setReleaseDateTime(formatted);
    setReleaseDescription(`Dự kiến khởi chiếu ${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())} ngày ${pad(baseDate.getDate())}/${pad(baseDate.getMonth() + 1)}/${baseDate.getFullYear()}`);
  };

  // Template toggle pin
  const handleTogglePinReleaseDesc = (id: string) => {
    setReleaseDescTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t)
    );
  };

  // Add new template
  const handleAddReleaseDesc = () => {
    const trimmed = newReleaseDescText.trim();
    if (!trimmed) return;
    const newTpl: ReleaseDescTemplate = {
      id: `rd-${Date.now()}`,
      text: trimmed,
      isPinned: newReleaseDescPinned
    };
    setReleaseDescTemplates(prev => [...prev, newTpl]);
    setNewReleaseDescText('');
    setReleaseDescription(trimmed);
    showCinemaAlert(`Đã thêm mẫu mô tả: "${trimmed}"`, 'success');
  };

  // Save edited template
  const handleSaveEditReleaseDesc = (id: string) => {
    const trimmed = editingReleaseDescText.trim();
    if (!trimmed) return;
    setReleaseDescTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, text: trimmed } : t)
    );
    setEditingReleaseDescId(null);
    setEditingReleaseDescText('');
  };

  // Delete template
  const handleDeleteReleaseDesc = (id: string) => {
    setReleaseDescTemplates(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div
      className={styles.upcomingModalBackdrop}
      onClick={onClose}
    >
      <div
        className={styles.upcomingModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleWrapper}>
            <FaCalendarAlt className="text-danger" size={16} />
            <h4 className={styles.modalTitle}>{MOVIE_FORM_I18N.step5.upcomingModalTitle}</h4>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            title="Đóng popup"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* Section 1: Thời điểm ra mắt dự kiến */}
          <div>
            <div className={styles.modalSectionTitle}>
              <FaClock className="me-1 text-danger" /> Thời điểm ra mắt dự kiến (Ngày & Giờ)
            </div>
            <input
              type="datetime-local"
              className={styles.inputControl}
              style={{ height: 38, fontSize: '0.85rem' }}
              value={releaseDateTime}
              onChange={(e) => {
                setReleaseDateTime(e.target.value);
                if (e.target.value) {
                  const d = new Date(e.target.value);
                  const pad = (n: number) => String(n).padStart(2, '0');
                  setReleaseDescription(`Dự kiến khởi chiếu ${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`);
                }
              }}
            />

            {/* Quick Date Adjustment Chips */}
            <div className={styles.quickDateRow}>
              <span className="text-muted small align-self-center me-1" style={{ fontSize: '0.7rem' }}>Chọn nhanh:</span>
              <button
                type="button"
                className={styles.btnQuickAdjust}
                onClick={() => addDaysToRelease(3)}
              >
                +3 ngày
              </button>
              <button
                type="button"
                className={styles.btnQuickAdjust}
                onClick={() => addDaysToRelease(7)}
              >
                +1 tuần
              </button>
              <button
                type="button"
                className={styles.btnQuickAdjust}
                onClick={() => addDaysToRelease(14)}
              >
                +2 tuần
              </button>
              <button
                type="button"
                className={styles.btnQuickAdjust}
                onClick={() => addDaysToRelease(30)}
              >
                +1 tháng
              </button>
            </div>
          </div>

          {/* Section 2: Mô tả hiển thị cho khán giả (Có cơ chế Ghim & CRUD tương tự lịch chiếu) */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <div className={styles.modalSectionTitle} style={{ margin: 0 }}>
                Mô tả hiển thị trên Web (Text hiển thị)
              </div>
              <button
                type="button"
                className={styles.btnQuickAdjust}
                style={{ height: 24, fontSize: '0.7rem', padding: '0 0.5rem' }}
                onClick={() => setIsManagingReleaseDesc(!isManagingReleaseDesc)}
                title="Mở bảng quản lý & thêm/sửa/xóa mẫu mô tả"
              >
                <FaSlidersH size={10} className="me-1" />
                {isManagingReleaseDesc ? 'Đóng quản lý' : `Quản lý mẫu (${releaseDescTemplates.length})`}
              </button>
            </div>

            <input
              type="text"
              className={styles.inputControl}
              style={{ height: 38, fontSize: '0.84rem' }}
              placeholder="Ví dụ: Dự kiến khởi chiếu 20:00 ngày 25/10/2026..."
              value={releaseDescription}
              onChange={(e) => setReleaseDescription(e.target.value)}
            />

            {/* Hàng phím tắt mẫu mô tả đã ghim */}
            <div className="d-flex flex-wrap gap-1 mt-1">
              {releaseDescTemplates.filter(t => t.isPinned).map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`${styles.showtimeChip} ${releaseDescription === tpl.text ? styles.showtimeChipPinned : ''}`}
                  onClick={() => setReleaseDescription(tpl.text)}
                  title={`Click để điền: "${tpl.text}"`}
                >
                  <FaThumbtack size={8} className="me-1 text-danger opacity-75" />
                  {tpl.text}
                </button>
              ))}
            </div>

            {/* Drawer Quản lý mẫu mô tả phát hành (Thêm, Sửa, Xóa, Ghim) */}
            {isManagingReleaseDesc && (
              <div className={styles.templateManageDrawer} style={{ marginTop: '0.5rem' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold text-white small" style={{ fontSize: '0.75rem' }}>
                    Danh sách & Thêm mẫu mô tả
                  </span>
                  <span className="text-muted small" style={{ fontSize: '0.68rem' }}>
                    Click 📌 để ghim/bỏ ghim phím tắt
                  </span>
                </div>

                {/* Add new template row */}
                <div className={styles.templateAddRow}>
                  <input
                    type="text"
                    className={styles.inputControl}
                    style={{ height: 28, fontSize: '0.75rem', flex: 1 }}
                    placeholder="Nhập mẫu mô tả phát hành mới..."
                    value={newReleaseDescText}
                    onChange={(e) => setNewReleaseDescText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddReleaseDesc())}
                  />
                  <label
                    className="d-flex align-items-center gap-1 cursor-pointer text-muted small user-select-none mb-0"
                    style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}
                    title="Ghim lên thanh phím tắt ngay sau khi thêm"
                  >
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      style={{ width: 13, height: 13 }}
                      checked={newReleaseDescPinned}
                      onChange={(e) => setNewReleaseDescPinned(e.target.checked)}
                    />
                    Ghim
                  </label>
                  <button
                    type="button"
                    className={styles.btnQuickAdjust}
                    style={{ height: 28, fontSize: '0.72rem' }}
                    onClick={handleAddReleaseDesc}
                  >
                    + Thêm
                  </button>
                </div>

                {/* Template list scroll */}
                <div className={styles.templateListScroll} style={{ maxHeight: 130 }}>
                  {releaseDescTemplates.map(t => (
                    <div key={t.id} className={styles.templateItemRow}>
                      <button
                        type="button"
                        className={`${styles.templateActionBtn} ${t.isPinned ? styles.templateActionBtnActive : ''}`}
                        onClick={() => handleTogglePinReleaseDesc(t.id)}
                        title={t.isPinned ? 'Bỏ ghim phím tắt' : 'Ghim làm phím tắt'}
                      >
                        <FaThumbtack size={10} />
                      </button>

                      {editingReleaseDescId === t.id ? (
                        <div className="d-flex align-items-center gap-1 flex-grow-1">
                          <input
                            type="text"
                            className={styles.inputControl}
                            style={{ height: 24, fontSize: '0.72rem', flex: 1 }}
                            value={editingReleaseDescText}
                            onChange={(e) => setEditingReleaseDescText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEditReleaseDesc(t.id)}
                            autoFocus
                          />
                          <button
                            type="button"
                            className={styles.btnQuickAdjust}
                            style={{ height: 24, fontSize: '0.68rem', padding: '0 0.4rem' }}
                            onClick={() => handleSaveEditReleaseDesc(t.id)}
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            className={styles.btnQuickAdjust}
                            style={{ height: 24, fontSize: '0.68rem', padding: '0 0.4rem' }}
                            onClick={() => setEditingReleaseDescId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <span
                          className={styles.templateItemText}
                          onClick={() => setReleaseDescription(t.text)}
                          title="Click để chọn mẫu này"
                        >
                          {t.text}
                        </span>
                      )}

                      {editingReleaseDescId !== t.id && (
                        <div className="d-flex align-items-center gap-1">
                          <button
                            type="button"
                            className={styles.templateActionBtn}
                            onClick={() => {
                              setEditingReleaseDescId(t.id);
                              setEditingReleaseDescText(t.text);
                            }}
                            title="Chỉnh sửa nội dung mẫu"
                          >
                            <FaEdit size={10} />
                          </button>
                          <button
                            type="button"
                            className={styles.templateActionBtn}
                            onClick={() => handleDeleteReleaseDesc(t.id)}
                            title="Xóa mẫu này"
                          >
                            <FaTrash size={9} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Tự động chuyển đổi trạng thái */}
          <div className="p-2 rounded bg-dark border border-secondary border-opacity-25">
            <label className="d-flex align-items-center justify-content-between cursor-pointer mb-2">
              <div>
                <div className="fw-bold small text-white">Tự động chuyển trạng thái khi đến hẹn</div>
                <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                  Hệ thống sẽ tự động cập nhật phim từ &quot;Sắp ra mắt&quot; sang phim đã phát hành
                </div>
              </div>
              <input
                type="checkbox"
                className="form-check-input ms-2"
                style={{ width: 18, height: 18 }}
                checked={autoSwitchStatus}
                onChange={(e) => setAutoSwitchStatus(e.target.checked)}
              />
            </label>

            {autoSwitchStatus && (
              <div className="pt-2 border-top border-secondary border-opacity-10">
                <div className="text-muted small mb-1" style={{ fontSize: '0.7rem' }}>
                  Trạng thái đích sau khi tự động chuyển:
                </div>
                <div className="d-flex gap-2">
                  <label className="d-flex align-items-center gap-1 cursor-pointer text-white small">
                    <input
                      type="radio"
                      name="targetStatus"
                      checked={targetStatusAfterRelease === 'ongoing'}
                      onChange={() => setTargetStatusAfterRelease('ongoing')}
                    />
                    <span>Đang phát hành / Đang chiếu (ongoing)</span>
                  </label>
                  <label className="d-flex align-items-center gap-1 cursor-pointer text-white small">
                    <input
                      type="radio"
                      name="targetStatus"
                      checked={targetStatusAfterRelease === 'completed'}
                      onChange={() => setTargetStatusAfterRelease('completed')}
                    />
                    <span>Hoàn thành / Trọn bộ (completed)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Đồng hồ đếm ngược */}
          <label className="d-flex align-items-center justify-content-between p-2 rounded bg-dark border border-secondary border-opacity-25 cursor-pointer">
            <div>
              <div className="fw-bold small text-white">Bật đồng hồ đếm ngược (Countdown)</div>
              <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                Hiển thị bộ đếm lùi ngày:giờ:phút:giây trên trang xem phim
              </div>
            </div>
            <input
              type="checkbox"
              className="form-check-input ms-2"
              style={{ width: 18, height: 18 }}
              checked={countdownEnabled}
              onChange={(e) => setCountdownEnabled(e.target.checked)}
            />
          </label>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnQuickAdjust}
            onClick={onClose}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className={styles.btnConfigUpcoming}
            onClick={() => {
              onClose();
              showCinemaAlert('Đã lưu cấu hình lịch ra mắt thành công!', 'success');
            }}
          >
            <FaCheck size={11} /> Xác nhận & Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpcomingMovieModal;
