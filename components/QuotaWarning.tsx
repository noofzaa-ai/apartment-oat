"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface QuotaWarningProps {
  currentRooms: number;
  maxRooms: number;
  planCode: string;
}

/**
 * Claymorphism banner warning when approaching room quota limit (≥90%)
 */
export function QuotaWarning({ currentRooms, maxRooms, planCode }: QuotaWarningProps) {
  const percentage = (currentRooms / maxRooms) * 100;
  const [dismissed, setDismissed] = useState(false);

  // Only show if >= 90% full
  if (percentage < 90 || dismissed) return null;

  return (
    <div className="quota-warning-clay">
      <div className="quota-warning-content">
        <span className="quota-warning-icon">⚠️</span>
        <div className="quota-warning-text">
          <strong>ใกล้ถึงขีดจำกัด!</strong>
          <p>คุณใช้ห้องไป {currentRooms}/{maxRooms} ห้อง กรุณาพิจารณาอัปเกรด</p>
        </div>
        <Link href="/app/subscription/plans" className="quota-warning-btn">
          ดูแผนอื่น
        </Link>
      </div>
      <button 
        className="quota-warning-close"
        onClick={() => setDismissed(true)}
        aria-label="ปิด"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Claymorphism modal shown when API returns 403 room_quota_exceeded
 */
interface QuotaExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    error: 'room_quota_exceeded';
    current: number;
    limit: number;
    planCode: string;
  };
}

export function QuotaExceededModal({ isOpen, onClose, error }: QuotaExceededModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-clay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="quota-modal-clay">
        <button className="quota-modal-close" onClick={onClose}>✕</button>
        
        <div className="quota-modal-icon">🚫</div>
        
        <h2 className="quota-modal-title">ไม่สามารถสร้างห้องเพิ่ม</h2>
        
        <div className="quota-modal-body">
          <p className="quota-modal-text">
            แผน <strong>{error.planCode}</strong> จำกัดสูงสุด <strong>{error.limit} ห้อง</strong>
          </p>
          <p className="quota-modal-subtext">
            คุณมีห้องอยู่แล้ว <strong>{error.current} ห้อง</strong>
          </p>
        </div>
        
        <div className="quota-modal-actions">
          <button className="quota-modal-btn-secondary" onClick={onClose}>
            ปิด
          </button>
          <Link href="/app/subscription/plans" className="quota-modal-btn-primary">
            ดูแผนอื่น
          </Link>
        </div>
      </div>
    </div>
  );
}

// Legacy exports for backward compatibility
export function QuotaBanner({ current, limit, planCode, planName }: { current: number; limit: number; planCode: string; planName: string }) {
  return <QuotaWarning currentRooms={current} maxRooms={limit} planCode={planCode} />;
}

export function QuotaModal({ isOpen, onClose, current, limit, planCode, planName }: { isOpen: boolean; onClose: () => void; current: number; limit: number; planCode: string; planName: string }) {
  return <QuotaExceededModal isOpen={isOpen} onClose={onClose} error={{ error: 'room_quota_exceeded', current, limit, planCode }} />;
}

/**
 * Upgrade CTA card for feature-gated pages
 */
interface FeatureUpgradeProps {
  feature: string;
  featureName: string;
  requiredPlan: string;
  requiredPlanName: string;
}

export function FeatureUpgradeCTA({ feature, featureName, requiredPlan, requiredPlanName }: FeatureUpgradeProps) {
  return (
    <div className="upgrade-cta-card">
      <div className="upgrade-cta-icon">🔒</div>
      <h3 className="upgrade-cta-title">{featureName}</h3>
      <p className="upgrade-cta-text">
        ฟีเจอร์นี้เฉพาะแผน <strong>{requiredPlanName}</strong> ขึ้นไป
      </p>
      <Link href="/app/subscription/plans" className="btn btn-primary">
        อัปเกรดเพื่อใช้งาน
      </Link>
    </div>
  );
}
