// client/src/components/Register/RegisterModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styles from './Register.module.css';
import { registrationSchema } from './registrationSchema.js';
import { registerParticipant } from '../../services/api.js';
import { startPayment } from '../../services/payment.js';
import { PRICING, PAYMENT_NOTE } from '../../data/event.js';
import Button from '../ui/Button.jsx';

export default function RegisterModal({ isOpen, onClose }) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);

  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const triggerRef = useRef(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      pairName: '',
      members: [
        { fullName: '', email: '', phone: '', department: '', year: '1' },
        { fullName: '', email: '', phone: '', department: '', year: '1' },
      ],
    },
    mode: 'onBlur',
  });

  // Exactly 2 members (fixed, non-removable)
  const { fields } = useFieldArray({
    control,
    name: 'members',
  });

  // Lock body scroll and handle focus trap / restore trigger on open/close
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Focus close button initially
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 60);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;

      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen]);

  // Trap focus and handle Escape
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !submitting) {
      e.preventDefault();
      handleModalClose();
      return;
    }

    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  const onSubmit = async (formData) => {
    if (submitting) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        pairName: formData.pairName ? formData.pairName.trim() : null,
        members: formData.members.map((m) => ({
          fullName: m.fullName.trim(),
          email: m.email.trim(),
          phone: m.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').trim(),
          department: m.department.trim(),
          year: m.year,
        })),
      };

      // Step 1: Submit pair registration to API (or mock adapter)
      const result = await registerParticipant(payload);

      // Step 2: Payment seam stub
      await startPayment(result.registration);

      // Step 3: Registration received success state
      setRegistrationResult(result.registration);
    } catch (err) {
      // Truthful error message: preserve inputs on error
      setServerError(
        `Server flinched: ${err.message || 'Network error'}. Don't worry, your details are still here, try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setServerError(null);
    if (registrationResult) {
      reset();
      setRegistrationResult(null);
    }
    // Note: If closed without success, form data is NOT wiped by accident
    onClose();
  };

  // Scroll active input into view on mobile keyboard display
  const handleInputFocus = (e) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 767) {
      setTimeout(() => {
        e.target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) handleModalClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
    >
      <div className={styles.modal} ref={modalRef}>
        {/* Sticky Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <span className={styles.modalTag}>// PAIR REGISTRATION</span>
            <h2 id="modal-title" className={styles.modalTitle}>
              {registrationResult ? 'Registration Received' : 'Register with Hommiee'}
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeButton}
            onClick={handleModalClose}
            aria-label="Close registration modal"
            disabled={submitting}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content: Success View or Form */}
        {registrationResult ? (
          <div className={styles.successBody}>
            <div className={styles.successIconWrapper}>✓</div>
            <h3 className={styles.successTitle}>Registration Received</h3>
            <div className={styles.successTagline}>Your spot has been queued for LARPER OR CODER.</div>

            <div className={styles.registrationCard}>
              <span className={styles.regIdLabel}>REGISTRATION ID</span>
              <span className={styles.regIdValue}>{registrationResult.id}</span>
              {registrationResult.pairName && (
                <span className={styles.regSubtext}>Pair: {registrationResult.pairName}</span>
              )}
              <span className={styles.regSubtext}>
                Format: Pair (2 coders) // Both tracks included (The Training Arc & TLE)
              </span>
              <span className={styles.regFeeSubtext}>
                Total Registration Fee: ₹{PRICING.pair} (₹{PRICING.perHead} × 2)
              </span>
            </div>

            {/* PAYMENT NOTE Line */}
            <div className={styles.paymentNoteBlock}>
              <span className={styles.paymentNoteIcon} aria-hidden="true">ℹ️</span>
              <span className={styles.paymentNoteText}>{PAYMENT_NOTE}</span>
            </div>

            <Button size="md" variant="primary" onClick={handleModalClose}>
              Done & Close
            </Button>
          </div>
        ) : (
          <form className={styles.formContainer} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.formBody}>
              {/* Error banner if submission failed */}
              {serverError && (
                <div className={styles.errorBanner} role="alert">
                  <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
                  <span>{serverError}</span>
                </div>
              )}

              {/* Pricing & Coverage Summary Banner */}
              <div className={styles.pricingSummaryCard}>
                <div className={styles.pricingLeft}>
                  <div className={styles.pricingFormula}>
                    2 people × ₹{PRICING.perHead} = <span className={styles.pricingTotal}>₹{PRICING.pair}</span>
                  </div>
                  <div className={styles.pricingCoverage}>
                    Includes The Training Arc and TLE
                  </div>
                </div>
                <div className={styles.pricingPill}>
                  ONE PASS COVERS ALL
                </div>
              </div>

              {/* Optional Pair Name */}
              <div className={styles.formGroup}>
                <label htmlFor="reg-pairname" className={styles.fieldLabel}>
                  Pair Name <span className={styles.optionalBadge}>(Optional)</span>
                </label>
                <input
                  id="reg-pairname"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. ByteForce"
                  className={`${styles.inputField} ${errors.pairName ? styles.hasError : ''}`}
                  aria-invalid={!!errors.pairName}
                  aria-describedby={errors.pairName ? 'reg-pairname-error' : undefined}
                  onFocus={handleInputFocus}
                  {...register('pairName')}
                />
                {errors.pairName && (
                  <span id="reg-pairname-error" className={styles.errorMessage} role="alert">
                    {errors.pairName.message}
                  </span>
                )}
              </div>

              {/* Two-Column Member Layout on Laptop / Stacked on Mobile */}
              <div className={styles.membersColumnsGrid}>
                {fields.map((field, index) => {
                  const memberNum = index + 1;
                  const memberErrors = errors.members?.[index];

                  return (
                    <div key={field.id} className={styles.memberCard}>
                      <div className={styles.memberCardHeader}>
                        <span>MEMBER #{memberNum} {memberNum === 1 ? '(PRIMARY CONTACT)' : ''}</span>
                      </div>

                      <div className={styles.memberFieldsGrid}>
                        {/* Full Name */}
                        <div className={styles.formGroup}>
                          <label htmlFor={`member-${index}-name`} className={styles.fieldLabelSmall}>
                            Full Name
                          </label>
                          <input
                            id={`member-${index}-name`}
                            type="text"
                            autoComplete={index === 0 ? 'name' : 'off'}
                            placeholder="e.g. Jane Doe"
                            className={`${styles.inputField} ${memberErrors?.fullName ? styles.hasError : ''}`}
                            aria-invalid={!!memberErrors?.fullName}
                            aria-describedby={memberErrors?.fullName ? `member-${index}-name-error` : undefined}
                            onFocus={handleInputFocus}
                            {...register(`members.${index}.fullName`)}
                          />
                          {memberErrors?.fullName && (
                            <span id={`member-${index}-name-error`} className={styles.errorMessage} role="alert">
                              {memberErrors.fullName.message}
                            </span>
                          )}
                        </div>

                        {/* Email */}
                        <div className={styles.formGroup}>
                          <label htmlFor={`member-${index}-email`} className={styles.fieldLabelSmall}>
                            Email Address
                          </label>
                          <input
                            id={`member-${index}-email`}
                            type="email"
                            autoComplete={index === 0 ? 'email' : 'off'}
                            placeholder="e.g. jane@example.com"
                            className={`${styles.inputField} ${memberErrors?.email ? styles.hasError : ''}`}
                            aria-invalid={!!memberErrors?.email}
                            aria-describedby={memberErrors?.email ? `member-${index}-email-error` : undefined}
                            onFocus={handleInputFocus}
                            {...register(`members.${index}.email`)}
                          />
                          {memberErrors?.email && (
                            <span id={`member-${index}-email-error`} className={styles.errorMessage} role="alert">
                              {memberErrors.email.message}
                            </span>
                          )}
                        </div>

                        {/* Phone */}
                        <div className={styles.formGroup}>
                          <label htmlFor={`member-${index}-phone`} className={styles.fieldLabelSmall}>
                            Phone (10 Digits)
                          </label>
                          <input
                            id={`member-${index}-phone`}
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            autoComplete={index === 0 ? 'tel' : 'off'}
                            placeholder="e.g. 9876543210"
                            className={`${styles.inputField} ${memberErrors?.phone ? styles.hasError : ''}`}
                            aria-invalid={!!memberErrors?.phone}
                            aria-describedby={memberErrors?.phone ? `member-${index}-phone-error` : undefined}
                            onFocus={handleInputFocus}
                            {...register(`members.${index}.phone`, {
                              onChange: (e) => {
                                // Strip non-numeric characters and limit to 10
                                const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                                e.target.value = raw;
                              },
                            })}
                          />
                          {memberErrors?.phone && (
                            <span id={`member-${index}-phone-error`} className={styles.errorMessage} role="alert">
                              {memberErrors.phone.message}
                            </span>
                          )}
                        </div>

                        {/* Year of Study */}
                        <div className={styles.formGroup}>
                          <label htmlFor={`member-${index}-year`} className={styles.fieldLabelSmall}>
                            Year of Study
                          </label>
                          <select
                            id={`member-${index}-year`}
                            className={`${styles.selectField} ${memberErrors?.year ? styles.hasError : ''}`}
                            aria-invalid={!!memberErrors?.year}
                            aria-describedby={memberErrors?.year ? `member-${index}-year-error` : undefined}
                            onFocus={handleInputFocus}
                            {...register(`members.${index}.year`)}
                          >
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                          </select>
                          {memberErrors?.year && (
                            <span id={`member-${index}-year-error`} className={styles.errorMessage} role="alert">
                              {memberErrors.year.message}
                            </span>
                          )}
                        </div>

                        {/* Department */}
                        <div className={styles.formGroup}>
                          <label htmlFor={`member-${index}-dept`} className={styles.fieldLabelSmall}>
                            Department
                          </label>
                          <input
                            id={`member-${index}-dept`}
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. CSE / IT"
                            className={`${styles.inputField} ${memberErrors?.department ? styles.hasError : ''}`}
                            aria-invalid={!!memberErrors?.department}
                            aria-describedby={memberErrors?.department ? `member-${index}-dept-error` : undefined}
                            onFocus={handleInputFocus}
                            {...register(`members.${index}.department`)}
                          />
                          {memberErrors?.department && (
                            <span id={`member-${index}-dept-error`} className={styles.errorMessage} role="alert">
                              {memberErrors.department.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky / Fixed Footer Actions */}
            <div className={styles.modalFooter}>
              <div className={styles.footerPriceSummaryMobile}>
                <span className={styles.footerFormula}>2 people × ₹{PRICING.perHead}</span>
                <span className={styles.footerTotal}>Total ₹{PRICING.pair}</span>
              </div>

              <div className={styles.footerActions}>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={handleModalClose}
                  disabled={submitting}
                  className={styles.cancelBtnDesktop}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                  className={styles.submitBtn}
                >
                  {submitting ? 'Registering with Hommiee...' : `Register with Hommiee - ₹${PRICING.pair}`}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
