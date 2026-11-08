// client/src/components/Register/RegisterModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styles from './Register.module.css';
import { registrationSchema } from './registrationSchema.js';
import { createOrder, verifyPayment } from '../../services/api.js';
import { loadCheckout, startPayment, readPendingPayment, savePendingPayment } from '../../services/payment.js';
import { PRICING } from '../../data/event.js';
import Button from '../ui/Button.jsx';

export default function RegisterModal({ isOpen, onClose }) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(readPendingPayment);
  const checkoutRef = useRef(null);
  const submittingRef = useRef(false);

  const modalRef = useRef(null);
  const errorRef = useRef(null);
  const closeBtnRef = useRef(null);
  const triggerRef = useRef(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      pairName: '',
      members: [
        { fullName: '', email: '', phone: '', rollNo: '', department: '', year: '1' },
        { fullName: '', email: '', phone: '', rollNo: '', department: '', year: '1' },
      ],
    },
    mode: 'onBlur',
  });

  // Exactly 2 members (fixed, non-removable)
  const { fields } = useFieldArray({
    control,
    name: 'members',
  });

  useEffect(() => {
    if (isOpen && serverError) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, serverError]);

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    let paymentDetails = pendingPayment;
    try {
      if (!paymentDetails) {
        const payload = {
          teamName: formData.pairName,
          members: formData.members.map(({ fullName, ...member }) => ({
            ...member, name: fullName, year: Number(member.year),
          })),
        };
        // Load Checkout before creating a pending team; blocked scripts must not hold seats.
        await loadCheckout();
        const fingerprint = JSON.stringify(payload);
        if (checkoutRef.current?.fingerprint !== fingerprint) {
          const order = await createOrder(payload);
          if (!order.orderId || !order.registrationId || !order.keyId || order.amount !== PRICING.orderAmountPaise || order.currency !== 'INR') {
            throw new Error('The payment order is invalid. Please contact the organisers.');
          }
          checkoutRef.current = { fingerprint, order };
        }
        paymentDetails = await startPayment(checkoutRef.current.order);
        setPendingPayment(paymentDetails);
        savePendingPayment(paymentDetails);
      }
      const result = await verifyPayment(paymentDetails);
      if (result.success !== true || !result.regCode || !result.registrationId) {
        throw new Error('The server has not confirmed your duo yet. Retry verification.');
      }
      setRegistrationResult(result);
      setPendingPayment(null);
      savePendingPayment(null);
      checkoutRef.current = null;
    } catch (err) {
      for (const issue of err.errors || []) {
        const field = issue.field?.replace(/^teamName$/, 'pairName').replace(/\.name$/, '.fullName');
        if (field) setError(field, { type: 'server', message: issue.message });
      }
      const conflicts = err.conflicts;
      if (conflicts && formData) {
        if (conflicts.teamName) setError('pairName', { message: 'This duo name is already taken.' });
        formData.members.forEach((member, index) => {
          for (const [field, key] of [['email', 'emails'], ['phone', 'phones'], ['rollNo', 'rollNos']]) {
            if (conflicts[key]?.some((value) => value.toLowerCase() === member[field].toLowerCase())) {
              setError(`members.${index}.${field}`, { message: 'Bro, You’re Already In 💀 This detail belongs to a registered participant.' });
            }
          }
        });
      }
      const prefix = err.code === 'SOLD_OUT' ? "Lobby Full. You're Late to the Party. "
        : err.code === 'DUPLICATE_REGISTRATION' ? "Bro, You're Already In 💀 "
        : err.status >= 500 ? 'The Server Is Having a Skill Issue. ' : '';
      const recovery = paymentDetails
        ? ` Your duo is not confirmed on this screen. Retry verification, not payment. Keep payment ID ${paymentDetails.razorpay_payment_id} for the organisers.`
        : '';
      setServerError(`${prefix}${err.message || 'Registration failed.'}${recovery}`);
    } finally {
      submittingRef.current = false;
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
            <span className={styles.modalTag}>// SECURE YOUR SPOT</span>
            <h2 id="modal-title" className={styles.modalTitle}>
              {registrationResult ? "You're On the List" : 'Assemble Your Duo'}
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
            <h3 className={styles.successTitle}>Duo Secured. Aura Loading.</h3>
            <div className={styles.successTagline}>Your payment and registration for LARPER OR CODER are confirmed. Show up with your homie and prove you're not all talk.</div>

            <div className={styles.registrationCard}>
              <span className={styles.regIdLabel}>REGISTRATION ID // SCREENSHOT THIS</span>
              <span className={styles.regIdValue}>{registrationResult.regCode}</span>
              {registrationResult.teamName && (
                <span className={styles.regSubtext}>Your duo: {registrationResult.teamName}</span>
              )}
              <span className={styles.regSubtext}>
                Format: Duo (2 coders) // Both events included: The Training Arc & TLE
              </span>
              <span className={styles.regFeeSubtext}>
                The damage: ₹{PRICING.pair} {PRICING.taxNote} (₹{PRICING.perHead}{'\u00a0'}×{'\u00a0'}2)
              </span>
            </div>

            {/* PAYMENT NOTE Line */}
            <div className={styles.paymentNoteBlock}>
              <span className={styles.paymentNoteIcon} aria-hidden="true">ℹ️</span>
              <span className={styles.paymentNoteText}>Payment confirmed. Screenshot your registration ID and keep it handy.</span>
            </div>

            <Button size="md" variant="primary" onClick={handleModalClose}>
              GG, Close This
            </Button>
          </div>
        ) : (
          <form className={styles.formContainer} onSubmit={(event) => handleSubmit(onSubmit)(event)} aria-busy={submitting} noValidate>
            <fieldset className={styles.formBody} disabled={submitting || !!pendingPayment}>
              {pendingPayment && !serverError && (
                <div className={styles.errorBanner} role="status">
                  Your payment needs server confirmation. Retry verification below; do not pay again.
                </div>
              )}
              {/* Error banner if submission failed */}
              {serverError && (
                <div className={styles.errorBanner} role="alert" ref={errorRef}>
                  <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
                  <span>{serverError}</span>
                </div>
              )}

              {/* Pricing & Coverage Summary Banner */}
              <div className={styles.pricingSummaryCard}>
                <div className={styles.pricingLeft}>
                  <div className={styles.pricingFormula}>
                    2 people × ₹{PRICING.perHead} = <span className={styles.pricingTotal}>₹{PRICING.pair} {PRICING.taxNote}</span>
                  </div>
                  <div className={styles.pricingCoverage}>
                    One duo, both events: The Training Arc and TLE
                  </div>
                </div>
                <div className={styles.pricingPill}>
                  THE DAMAGE REPORT
                </div>
              </div>

              {/* Required team name */}
              <div className={styles.formGroup}>
                <label htmlFor="reg-pairname" className={styles.fieldLabel}>
                  Drop the Duo's Name <span className={styles.optionalBadge}>(Required. Please don't name it Team 1.)</span>
                </label>
                <input
                  id="reg-pairname"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Runtime Terrors"
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
                        <span>{memberNum === 1 ? 'PLAYER ONE (PRIMARY CONTACT)' : 'PLAYER TWO'}</span>
                      </div>

                      <div className={styles.memberFieldsGrid}>
                        {/* Full Name */}
                        <div className={styles.formGroup}>
                          <label htmlFor={`member-${index}-name`} className={styles.fieldLabelSmall}>
                            Full Name (The Government One)
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

                        {[
                          ['rollNo', 'Drop Your Registration Number', 'e.g. 2026CSE001'],
                        ].map(([name, label, placeholder]) => (
                          <div className={styles.formGroup} key={name}>
                            <label htmlFor={`member-${index}-${name}`} className={styles.fieldLabelSmall}>{label}</label>
                            <input
                              id={`member-${index}-${name}`}
                              type="text"
                              autoComplete="off"
                              placeholder={placeholder}
                              className={`${styles.inputField} ${memberErrors?.[name] ? styles.hasError : ''}`}
                              aria-invalid={!!memberErrors?.[name]}
                              aria-describedby={memberErrors?.[name] ? `member-${index}-${name}-error` : undefined}
                              onFocus={handleInputFocus}
                              {...register(`members.${index}.${name}`)}
                            />
                            {memberErrors?.[name] && (
                              <span id={`member-${index}-${name}-error`} className={styles.errorMessage} role="alert">
                                {memberErrors[name].message}
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Email */}
                        <div className={styles.formGroup}>
                          <label htmlFor={`member-${index}-email`} className={styles.fieldLabelSmall}>
                            Drop Your Email
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
                            Drop Your Digits (10-Digit Mobile)
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
                            Which Year Are You Surviving?
                          </label>
                          <select
                            id={`member-${index}-year`}
                            className={`${styles.selectField} ${memberErrors?.year ? styles.hasError : ''}`}
                            aria-invalid={!!memberErrors?.year}
                            aria-describedby={memberErrors?.year ? `member-${index}-year-error` : undefined}
                            onFocus={handleInputFocus}
                            {...register(`members.${index}.year`)}
                          >
                            <option value="1">1st Year · Fresh Spawn</option>
                            <option value="2">2nd Year · Side Quests</option>
                            <option value="3">3rd Year · Main Story</option>
                            <option value="4">4th Year · Final Boss</option>
                            <option value="5">5th Year · Bonus Level</option>
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
                            What's Your Department?
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
            </fieldset>

            {/* Sticky / Fixed Footer Actions */}
            <div className={styles.modalFooter}>
              <div className={styles.footerPriceSummaryMobile}>
                <span className={styles.footerFormula}>2 people × ₹{PRICING.perHead}</span>
                <span className={styles.footerTotal}>Total ₹{PRICING.pair} {PRICING.taxNote}</span>
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
                  Nah, Go Back
                </Button>
                <Button
                  type={pendingPayment ? "button" : "submit"}
                  onClick={pendingPayment ? () => onSubmit() : undefined}
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                  className={styles.submitBtn}
                >
                  {submitting ? 'Cooking Your Registration...' : pendingPayment ? 'Retry Payment Verification' : `Lock In the Duo · ₹${PRICING.pair} ${PRICING.taxNote}`}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
