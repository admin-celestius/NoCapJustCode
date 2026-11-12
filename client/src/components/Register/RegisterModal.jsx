// client/src/components/Register/RegisterModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styles from './Register.module.css';
import { registrationSchema } from './registrationSchema.js';
import { createOrder, verifyPayment, checkTeamNameAvailability, checkRegistrationConflicts } from '../../services/api.js';
import { loadCheckout, startPayment, readPendingPayment, savePendingPayment } from '../../services/payment.js';
import { getActivePricing, WHATSAPP_GROUP_URL } from '../../data/event.js';
import { downloadPassPdf, downloadPassImage } from '../../services/passGenerator.js';
import Button from '../ui/Button.jsx';
import ColorOSDropdown from './ColorOSDropdown.jsx';
import ParticleCanvas from './ParticleCanvas.jsx';
import BouncingBallsCanvas from './BouncingBallsCanvas.jsx';
import locLogoWebp from '../../assets/logo-transparent.webp';
import locLogoPng from '../../assets/logo-transparent.png';

const YEAR_OPTIONS = [
  { value: '1', label: '1st Year (Only 1st-Year Students Eligible)' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'CSE', label: 'CSE · Computer Science' },
  { value: 'IT', label: 'IT · Information Technology' },
  { value: 'AI & DS', label: 'AI & DS · Artificial Intelligence' },
  { value: 'AI & ML', label: 'AI & ML · Machine Learning' },
  { value: 'CSBS', label: 'CSBS · Business Systems' },
  { value: 'Cyber Security', label: 'Cyber Security' },
  { value: 'ECE', label: 'ECE · Electronics & Comm' },
  { value: 'EEE', label: 'EEE · Electrical & Electronics' },
  { value: 'Mechanical', label: 'Mechanical Engineering' },
  { value: 'Civil', label: 'Civil Engineering' },
  { value: 'Mechatronics', label: 'Mechatronics' },
  { value: 'ACT', label: 'ACT' },
  { value: 'VLSI', label: 'VLSI' },
  { value: 'BME', label: 'BME' },
];

export default function RegisterModal({
  isOpen,
  onClose,
  promoActive = true,
  registrationsClosed = false,
  soldOut = false,
  onRefreshStatus,
}) {
  const isClosed = registrationsClosed || soldOut;
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(readPendingPayment);
  const [isClosing, setIsClosing] = useState(false);
  const checkoutRef = useRef(null);
  const submittingRef = useRef(false);

  // Live Duo Codename Status: 'idle' | 'checking' | 'available' | 'taken'
  const [teamNameStatus, setTeamNameStatus] = useState('idle');
  const checkDebounceRef = useRef(null);
  const currentQueryRef = useRef('');

  // Flow State: 'form' | 'awaiting' | 'success' | 'failure'
  const [flowState, setFlowState] = useState('form');
  const [awaitingNote, setAwaitingNote] = useState('Waiting for payment status...');
  const [failureMessage, setFailureMessage] = useState(null);
  const [showResultText, setShowResultText] = useState(false);
  const [passDownloading, setPassDownloading] = useState(null); // 'pdf' | 'png' | null

  // ColorOS Toast Notification State
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Collapse / Expand states for Player 1 & Player 2: default both expanded
  const [collapsed, setCollapsed] = useState({ 0: false, 1: false });
  const [openDropdownPlayer, setOpenDropdownPlayer] = useState(null);

  const modalRef = useRef(null);
  const errorRef = useRef(null);
  const closeBtnRef = useRef(null);
  const triggerRef = useRef(null);

  const showToast = (message) => {
    if (!message) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      pairName: '',
      members: [
        { fullName: '', email: '', phone: '', rollNo: '', department: 'CSE', year: '1' },
        { fullName: '', email: '', phone: '', rollNo: '', department: 'CSE', year: '1' },
      ],
    },
    mode: 'onBlur',
  });

  const watchedMembers = watch('members') || [];
  const watchedPairName = watch('pairName');

  // Live Duo Codename Availability Checker with Debounce
  useEffect(() => {
    const trimmed = (watchedPairName || '').trim();

    if (!trimmed || trimmed.length < 2) {
      setTeamNameStatus('idle');
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
      return;
    }

    setTeamNameStatus('checking');

    if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);

    checkDebounceRef.current = setTimeout(async () => {
      currentQueryRef.current = trimmed;
      try {
        const res = await checkTeamNameAvailability(trimmed);
        if (currentQueryRef.current === trimmed) {
          if (res.available) {
            setTeamNameStatus('available');
            clearErrors('pairName');
          } else {
            setTeamNameStatus('taken');
            setError('pairName', { type: 'manual', message: 'This duo codename is already taken.' });
          }
        }
      } catch (err) {
        if (currentQueryRef.current === trimmed) {
          if (err?.code === 'DUPLICATE_REGISTRATION' || err?.status === 409) {
            setTeamNameStatus('taken');
            setError('pairName', { type: 'manual', message: 'This duo codename is already taken.' });
          } else {
            setTeamNameStatus('idle');
          }
        }
      }
    }, 350);

    return () => {
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    };
  }, [watchedPairName, setError, clearErrors]);

  // Exactly 2 members (fixed duo)
  const { fields } = useFieldArray({
    control,
    name: 'members',
  });

  const togglePlayer = (index) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Auto-expand if a player card has errors
  useEffect(() => {
    if (errors.members?.[0]) {
      setCollapsed((prev) => ({ ...prev, 0: false }));
    }
    if (errors.members?.[1]) {
      setCollapsed((prev) => ({ ...prev, 1: false }));
    }
  }, [errors.members]);

  useEffect(() => {
    if (isOpen && serverError) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, serverError]);

  useEffect(() => {
    if (isOpen) {
      onRefreshStatus?.();
    }
  }, [isOpen, onRefreshStatus]);

  // Lock body scroll and handle focus trap / restore trigger on open/close
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

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

  if (!isOpen && !isClosing) return null;

  // Extract the most relevant error message for the toast
  const extractFirstErrorMessage = (formErrors) => {
    if (!formErrors) return 'Please check the highlighted fields.';
    if (formErrors.pairName?.message) {
      return formErrors.pairName.message;
    }
    if (formErrors.members?.[0]) {
      const m0 = formErrors.members[0];
      const firstKey = Object.keys(m0).find((k) => m0[k]?.message);
      if (firstKey) return `Player 1: ${m0[firstKey].message}`;
    }
    if (formErrors.members?.[1]) {
      const m1 = formErrors.members[1];
      const firstKey = Object.keys(m1).find((k) => m1[k]?.message);
      if (firstKey) return `Player 2: ${m1[firstKey].message}`;
    }
    if (formErrors.members?.root?.message || formErrors.members?.message) {
      return formErrors.members.root?.message || formErrors.members.message;
    }
    const firstTop = Object.values(formErrors).find((err) => err?.message);
    return firstTop?.message || 'Please check the highlighted fields.';
  };

  // Called when validation fails on submit ("Lock In" click)
  const onInvalid = (formErrors) => {
    const errorMsg = extractFirstErrorMessage(formErrors);
    showToast(errorMsg);
    if (formErrors.members?.[0]) setCollapsed((prev) => ({ ...prev, 0: false }));
    if (formErrors.members?.[1]) setCollapsed((prev) => ({ ...prev, 1: false }));
  };

  const onSubmit = async (formData) => {
    if (submittingRef.current) return;
    if (isClosed) {
      const msg = registrationsClosed
        ? 'Registrations are currently closed by the organisers.'
        : "Lobby Full. You're Late to the Party. Registration is sold out.";
      showToast(msg);
      return;
    }
    if (teamNameStatus === 'taken') {
      setError('pairName', { type: 'manual', message: 'This duo codename is already taken.' });
      showToast('This duo codename is already taken. Please choose a unique name.');
      return;
    }

    if (!pendingPayment && formData) {
      try {
        const checkPayload = {
          teamName: (formData.pairName || '').trim(),
          emails: (formData.members || []).map((m) => (m.email || '').trim().toLowerCase()),
          phones: (formData.members || []).map((m) => (m.phone || '').trim().replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')),
          rollNos: (formData.members || []).map((m) => (m.rollNo || '').trim().toUpperCase()),
        };
        const checkRes = await checkRegistrationConflicts(checkPayload);
        if (checkRes?.available === false && checkRes?.conflicts) {
          const { conflicts } = checkRes;
          let conflictFound = false;

          if (conflicts.teamName) {
            setTeamNameStatus('taken');
            setError('pairName', { type: 'manual', message: 'This duo codename is already taken.' });
            conflictFound = true;
          }

          formData.members.forEach((member, index) => {
            const cleanPhone = (member.phone || '').trim().replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
            const cleanEmail = (member.email || '').trim().toLowerCase();
            const cleanRoll = (member.rollNo || '').trim().toUpperCase();

            if (conflicts.emails?.some((e) => e.toLowerCase() === cleanEmail)) {
              setError(`members.${index}.email`, { type: 'manual', message: "Bro, You're Already In. This email belongs to a registered participant." });
              conflictFound = true;
            }
            if (conflicts.phones?.some((p) => p === cleanPhone)) {
              setError(`members.${index}.phone`, { type: 'manual', message: "Bro, You're Already In. This mobile number belongs to a registered participant." });
              conflictFound = true;
            }
            if (conflicts.rollNos?.some((r) => r.toUpperCase() === cleanRoll)) {
              setError(`members.${index}.rollNo`, { type: 'manual', message: "Bro, You're Already In. This registration number belongs to a registered participant." });
              conflictFound = true;
            }
          });

          if (conflictFound) {
            showToast("Bro, You're Already In. Some participant details are already registered.");
            return;
          }
        }
      } catch (err) {
        if (err?.conflicts) {
          showToast("Bro, You're Already In. Some participant details are already registered.");
          return;
        }
      }
    }

    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    setFailureMessage(null);
    setFlowState('waiting');
    setAwaitingNote('Awaiting for payment status...');

    let paymentDetails = pendingPayment;
    let paymentResult = null;
    let paymentError = null;

    try {
      if (!paymentDetails) {
        const payload = {
          teamName: formData.pairName,
          members: formData.members.map(({ fullName, ...member }) => ({
            ...member, name: fullName, year: Number(member.year),
          })),
        };
        await loadCheckout();
        const fingerprint = JSON.stringify(payload);
        if (checkoutRef.current?.fingerprint !== fingerprint) {
          const currentPricing = getActivePricing(promoActive);
          const order = await createOrder(payload);
          if (!order.orderId || !order.registrationId || !order.keyId || order.currency !== 'INR') {
            throw new Error('The payment order is invalid. Please contact the organisers.');
          }
          if (order.amount !== currentPricing.orderAmountPaise) {
            onRefreshStatus?.();
            throw new Error('Offer pricing was just updated by the organisers. Please review the updated total and try again.');
          }
          checkoutRef.current = { fingerprint, order };
        }
        paymentDetails = await startPayment(checkoutRef.current.order);
        setPendingPayment(paymentDetails);
        savePendingPayment(paymentDetails);
      }

      setAwaitingNote('Payment received. Finalizing verification...');
      const result = await verifyPayment(paymentDetails);
      if (result.success !== true || !result.regCode || !result.registrationId) {
        throw new Error('The server has not confirmed your duo yet. Retry verification.');
      }
      paymentResult = result;
    } catch (err) {
      paymentError = err;
    }

    // Keep the awaiting LOC animation for 5 seconds after getting the response
    await new Promise((resolve) => setTimeout(resolve, 5000));

    setShowResultText(false);

    if (paymentResult) {
      setRegistrationResult(paymentResult);
      setPendingPayment(null);
      savePendingPayment(null);
      checkoutRef.current = null;
      setFlowState('success');
      setTimeout(() => setShowResultText(true), 3500);
    } else {
      const err = paymentError || new Error('Payment was not completed.');
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
              setError(`members.${index}.${field}`, { message: 'Bro, You are Already In. This detail belongs to a registered participant.' });
            }
          }
        });
      }

      let errorMsg = err.message || 'Payment was cancelled or failed.';
      if (err.code === 'PAYMENT_CANCELLED') {
        errorMsg = 'Checkout was cancelled before completion. Your duo details are safely preserved.';
      } else if (err.code === 'REGISTRATIONS_CLOSED') {
        errorMsg = 'Registrations have been closed by the organisers.';
        onRefreshStatus?.();
      } else if (err.code === 'SOLD_OUT') {
        errorMsg = "Lobby Full. You're Late to the Party. Registration is sold out.";
        onRefreshStatus?.();
      } else if (err.code === 'DUPLICATE_REGISTRATION') {
        errorMsg = "Bro, You're Already In. This detail belongs to a registered participant.";
      }

      setFailureMessage(errorMsg);
      setServerError(errorMsg);
      setFlowState('failure');
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 860;
      setTimeout(() => setShowResultText(true), isMobile ? 500 : 2200);
    }

    submittingRef.current = false;
    setSubmitting(false);
  };

  const handleDownloadPdf = async () => {
    if (passDownloading) return;
    try {
      setPassDownloading('pdf');
      const formMembers = getValues('members') || [];
      const passData = {
        regCode: registrationResult?.regCode || 'TEAM',
        teamName: registrationResult?.teamName || getValues('pairName') || 'Duo Team',
        members: registrationResult?.members?.length ? registrationResult.members : formMembers.map((m) => ({ name: m.fullName })),
      };
      await downloadPassPdf(passData);
    } catch (err) {
      console.error('Failed to generate PDF pass:', err);
      showToast('Unable to generate PDF pass. Please try saving as PNG or taking a screenshot.');
    } finally {
      setPassDownloading(null);
    }
  };

  const handleDownloadImage = async () => {
    if (passDownloading) return;
    try {
      setPassDownloading('png');
      const formMembers = getValues('members') || [];
      const passData = {
        regCode: registrationResult?.regCode || 'TEAM',
        teamName: registrationResult?.teamName || getValues('pairName') || 'Duo Team',
        members: registrationResult?.members?.length ? registrationResult.members : formMembers.map((m) => ({ name: m.fullName })),
      };
      await downloadPassImage(passData);
    } catch (err) {
      console.error('Failed to generate PNG pass:', err);
      showToast('Unable to generate image pass. Please take a screenshot.');
    } finally {
      setPassDownloading(null);
    }
  };

  const handleTryAgain = () => {
    setShowResultText(false);
    setFlowState('form');
    setFailureMessage(null);
    setServerError(null);
  };

  const handleModalClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);

    setTimeout(() => {
      setIsClosing(false);
      setShowResultText(false);
      setServerError(null);
      setFlowState('form');
      setFailureMessage(null);
      setTeamNameStatus('idle');
      if (registrationResult) {
        reset();
        setRegistrationResult(null);
      }
      onClose();
    }, 300);
  };

  const handleInputFocus = (e) => {
    if (!e) return;
    const target = e.target || (e.currentTarget ? e.currentTarget : null);
    if (!target || typeof target.scrollIntoView !== 'function') return;

    if (typeof window !== 'undefined' && window.innerWidth <= 860) {
      setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          // ignore unmounted elements
        }
      }, 300);
    }
  };

  const activePricing = getActivePricing(promoActive);
  const backdropMode = flowState === 'success' ? 'tick' : flowState === 'failure' ? 'cross' : 'ambient';

  return (
    <div
      className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting && flowState !== 'waiting' && flowState !== 'awaiting') handleModalClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Fullscreen Backdrop Particles (Tiny red particles floating outside the modal, morphs to Green Tick or Red Cross) */}
      <ParticleCanvas mode={backdropMode} isClosing={isClosing} />

      {/* ========================================================
          STAGE 1: WAITING FOR PAYMENT (LOC Logo + Rotating Spinner)
          ======================================================== */}
      {flowState === 'waiting' || flowState === 'awaiting' ? (
        <div className={`${styles.modal} ${styles.modalStageCentered} ${isClosing ? styles.modalClosing : ''}`} ref={modalRef}>
          <div className={styles.stageContentCentered}>
            <div className={styles.locSpinnerContainer}>
              <div className={styles.locSpinnerRing} />
              <picture className={styles.locLogoSpinnerPic}>
                <source srcSet={locLogoWebp} type="image/webp" />
                <img src={locLogoPng} alt="LARPER OR CODER" className={styles.locLogoSpinnerImg} />
              </picture>
            </div>
            <h3 className={styles.awaitingTitle}>Waiting for the payment status...</h3>
            <p className={styles.awaitingSubtitle}>
              {awaitingNote || 'Complete your transaction in Checkout. Do not close or refresh this page.'}
            </p>
            <div className={styles.awaitingPulseBar}>
              <span className={styles.pulseDot} />
              <span className={styles.pulseDot} />
              <span className={styles.pulseDot} />
            </div>
          </div>
        </div>
      ) : flowState === 'success' ? (
        /* ========================================================
           STAGE 2: SUCCESS (Confirmation on Top -> Center Green Tick -> Bottom Details & Close)
           ======================================================== */
        <div className={`${styles.fullscreenResultStage} ${isClosing ? styles.backdropClosing : ''}`}>
          <button
            type="button"
            className={styles.resultFloatingCloseBtn}
            onClick={handleModalClose}
            aria-label="Close registration modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* TOP SECTION: Confirmation Message above the symbol */}
          {showResultText ? (
            <div className={styles.resultFloatingTop}>
              <h2 className={styles.resultTitleSuccess}>
                Your Registration to LOC is Officially Confirmed
              </h2>
              <p className={styles.resultSubtitleSuccess}>
                Payment verified. Show up with your homie and prove you're not all talk.
              </p>
            </div>
          ) : (
            <div className={styles.phase1Spacer} />
          )}

          {/* Dedicated unobstructed clear zone on mobile for the particle tick symbol */}
          {showResultText && <div className={styles.resultCenterSymbolZone} aria-hidden="true" />}

          {/* BOTTOM SECTION: Floating Registration ID & Actions (Zero Containers) */}
          {showResultText ? (
            <div className={styles.resultFloatingBottom}>
              <div className={styles.registrationFloatingInfo}>
                <span className={styles.regIdLabel}>Registration ID</span>
                <span className={styles.regIdValue}>{registrationResult?.regCode}</span>
                {registrationResult?.teamName && (
                  <span className={styles.regSubtext}>Duo: {registrationResult.teamName}</span>
                )}
              </div>

              {/* WhatsApp Group Action (Emerald Green) */}
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappJoinBtn}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>Join Official WhatsApp Group</span>
              </a>
              <span className={styles.whatsappNote}>
                Mandatory for info exchanges, round timings, and official announcements.
              </span>

              {/* Dynamic Entry Pass Downloads */}
              <div className={styles.passDownloadActions}>
                <button
                  type="button"
                  className={styles.pdfDownloadBtn}
                  onClick={handleDownloadPdf}
                  disabled={passDownloading !== null}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{passDownloading === 'pdf' ? 'Generating PDF...' : 'Download Entry Pass (PDF)'}</span>
                </button>

                <button
                  type="button"
                  className={styles.pngDownloadBtn}
                  onClick={handleDownloadImage}
                  disabled={passDownloading !== null}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>{passDownloading === 'png' ? 'Saving PNG...' : 'Save Pass (PNG)'}</span>
                </button>
              </div>

              <div className={styles.successActionsGroup}>
                <Button size="md" variant="ghost" onClick={handleModalClose}>
                  Done, Close This
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.phase1Spacer} />
          )}
        </div>
      ) : flowState === 'failure' ? (
        /* ========================================================
           STAGE 3: FAILURE / CANCELLED (Incomplete on Top -> Center Red Cross -> Bottom Actions)
           ======================================================== */
        <div className={`${styles.fullscreenResultStage} ${isClosing ? styles.backdropClosing : ''}`}>
          <button
            type="button"
            className={styles.resultFloatingCloseBtn}
            onClick={handleModalClose}
            aria-label="Close error modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* TOP SECTION: Incomplete Message above the symbol */}
          {showResultText ? (
            <div className={styles.resultFloatingTop}>
              <h2 className={styles.resultTitleFailure}>
                Payment Incomplete
              </h2>
              <p className={styles.resultSubtitleFailure}>
                {failureMessage || 'Your payment was not completed or was cancelled. Your duo is not confirmed yet.'}
              </p>
            </div>
          ) : (
            <div className={styles.phase1Spacer} />
          )}

          {/* Dedicated unobstructed clear zone on mobile for the particle cross symbol */}
          {showResultText && <div className={styles.resultCenterSymbolZone} aria-hidden="true" />}

          {/* BOTTOM SECTION: Preserved note & actions (Zero Containers) */}
          {showResultText ? (
            <div className={styles.resultFloatingBottom}>
              <p className={styles.failureDetailNote}>
                Don't worry, all your duo details are safely preserved. You can try again right now.
              </p>
              <div className={styles.failureActionsGroup}>
                <Button size="md" variant="primary" onClick={handleTryAgain}>
                  Try Again
                </Button>
                <Button size="md" variant="ghost" onClick={handleModalClose}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.phase1Spacer} />
          )}
        </div>
      ) : (
        /* ========================================================
           STAGE 0: REGISTRATION FORM (With Fast 3D Bouncing Orange Balls)
           ======================================================== */
        <div className={`${styles.modal} ${isClosing ? styles.modalClosing : ''}`} ref={modalRef}>
          {/* COLOROS TOAST NOTIFICATION CONTAINER */}
          {toast && (
            <div className={styles.toastContainer} key={toast.id}>
              <div className={styles.toast} role="alert" aria-live="assertive">
                <div className={styles.toastIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <span className={styles.toastMessage}>{toast.message}</span>
                <button
                  type="button"
                  className={styles.toastCloseBtn}
                  onClick={() => setToast(null)}
                  aria-label="Dismiss error notification"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* LEFT BRAND SIDEBAR */}
          <aside className={styles.brandSidebar}>
            <div className={styles.brandTop}>
              <span className={styles.brandPreHeading}>You're registering for</span>
            </div>

            <div className={styles.brandCenter}>
              <div className={styles.logoAnimContainer}>
                <picture className={styles.locPicture}>
                  <source srcSet={locLogoWebp} type="image/webp" />
                  <img
                    src={locLogoPng}
                    alt="Larper or Coder"
                    className={styles.locLogoImg}
                    width={320}
                    height={130}
                  />
                </picture>
                <div className={styles.laserScanLine} aria-hidden="true" />
              </div>

              <div className={styles.brandMeta}>
                <span className={styles.brandEventName}>The Training Arc &amp; TLE</span>
                <span className={styles.brandPassInfo}>
                  2 Coders · {activePricing.isPromo && <span style={{ textDecoration: 'line-through', opacity: 0.5, marginRight: '4px' }}>₹{activePricing.regularPair}</span>}₹{activePricing.pair}
                </span>
                {activePricing.isPromo && (
                  <span className={styles.brandPromoNote}>National Education Day Offer · Closing Soon</span>
                )}
              </div>
            </div>

            <div className={styles.brandBottom}>
              <span className={styles.byLabel}>By</span>
              <a
                href="https://celestius.in"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.celestiusLink}
                aria-label="Celestius website (opens in a new tab)"
              >
                <img
                  src="/Celestius_modified_curved.png"
                  alt="Celestius"
                  className={styles.celestiusLogoImg}
                  onError={(e) => {
                    e.currentTarget.src = '/celestius_original.png';
                  }}
                />
              </a>
            </div>
          </aside>

          {/* RIGHT MAIN CONTENT */}
          <div className={styles.formContainer}>
            {/* Header Bar */}
            <div className={styles.modalHeader}>
              <div className={styles.headerTitleGroup}>
                <div className={styles.mobileLocLogoWrapper}>
                  <picture>
                    <source srcSet={locLogoWebp} type="image/webp" />
                    <img
                      src={locLogoPng}
                      alt="Larper or Coder"
                      className={styles.mobileLocLogoImg}
                      width={120}
                      height={49}
                    />
                  </picture>
                </div>
                <h2 id="modal-title" className={styles.modalTitle}>
                  Assemble Your Duo
                </h2>
                <p className={styles.modalSubtitle}>
                  {activePricing.isPromo
                    ? `Exclusively for 1st-year CIT students · National Education Day Offer (₹${activePricing.pair} for both).`
                    : 'Exclusively for 1st-year CIT students · Covers both events for 2 coders.'}
                </p>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                className={styles.closeButton}
                onClick={handleModalClose}
                aria-label="Close registration modal"
                disabled={submitting}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className={styles.formInner} onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
              <div className={styles.formScrollArea}>
                <BouncingBallsCanvas />
                <fieldset className={styles.formScrollBody} disabled={submitting || !!pendingPayment || isClosed}>
                {isClosed && (
                  <div className={styles.statusBanner} role="alert">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span>
                      {registrationsClosed
                        ? 'Registrations are currently closed by the organisers.'
                        : 'All registration slots are currently full.'}
                    </span>
                  </div>
                )}
                {pendingPayment && !serverError && (
                  <div className={styles.statusBanner} role="status">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Your payment needs server confirmation. Retry verification below; do not pay again.</span>
                  </div>
                )}

                {/* Duo Codename Input Field with Live Availability Indicator */}
                <div className={styles.formGroupTop}>
                  <div className={styles.labelRow}>
                    <label htmlFor="reg-pairname" className={styles.fieldLabel}>
                      Duo Codename
                    </label>
                    {teamNameStatus === 'checking' ? (
                      <span className={styles.statusBadgeChecking}>
                        <span className={styles.miniSpinner} aria-hidden="true" />
                        Checking...
                      </span>
                    ) : teamNameStatus === 'available' ? (
                      <span className={styles.statusBadgeAvailable}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Codename Available
                      </span>
                    ) : teamNameStatus === 'taken' ? (
                      <span className={styles.statusBadgeTaken}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Already Taken
                      </span>
                    ) : (
                      <span className={styles.fieldHelper}>Required · Don't name it Team 1</span>
                    )}
                  </div>

                  <div className={styles.inputWrapperWithStatus}>
                    <input
                      id="reg-pairname"
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. Runtime Terrors"
                      className={`${styles.inputField} ${styles.inputFieldWithStatus} ${
                        teamNameStatus === 'available'
                          ? styles.inputAvailable
                          : teamNameStatus === 'taken' || errors.pairName
                          ? styles.inputTaken
                          : ''
                      }`}
                      aria-invalid={teamNameStatus === 'taken' || !!errors.pairName}
                      onFocus={handleInputFocus}
                      {...register('pairName')}
                    />

                    <div className={styles.inputStatusIcon} aria-hidden="true">
                      {teamNameStatus === 'checking' && (
                        <span className={styles.miniSpinner} />
                      )}
                      {teamNameStatus === 'available' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00F076" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {teamNameStatus === 'taken' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* Member 1 & Member 2 Accordion Cards (No inline error text below) */}
                <div className={styles.membersStack}>
                  {fields.map((field, index) => {
                    const memberNum = index + 1;
                    const memberErrors = errors.members?.[index];
                    const isCollapsed = !!collapsed[index];
                    const currentName = watchedMembers[index]?.fullName?.trim();
                    const currentRoll = watchedMembers[index]?.rollNo?.trim();

                    return (
                      <div
                        key={field.id}
                        className={`${styles.memberAccordionCard} ${isCollapsed ? styles.cardCollapsed : ''} ${openDropdownPlayer === index ? styles.cardWithOpenDropdown : ''}`}
                      >
                        {/* Header toggle button */}
                        <button
                          type="button"
                          className={styles.accordionHeaderBtn}
                          onClick={() => togglePlayer(index)}
                          aria-expanded={!isCollapsed}
                          aria-controls={`member-section-${index}`}
                        >
                          <div className={styles.playerTitleWrapper}>
                            <span className={`${styles.playerDot} ${memberNum === 1 ? styles.dotOne : styles.dotTwo}`} />
                            <span className={styles.playerNameTitle}>
                              Player {memberNum} {memberNum === 1 ? '(Alpha)' : '(Bravo)'}
                            </span>
                            {isCollapsed && currentName && (
                              <span className={styles.collapsedPreview}>
                                · {currentName}{currentRoll ? ` (${currentRoll})` : ''}
                              </span>
                            )}
                          </div>

                          <div className={styles.headerRightControls}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ''}`}
                              aria-hidden="true"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>

                        {/* Collapsible Content */}
                        <div
                          id={`member-section-${index}`}
                          className={`${styles.accordionBody} ${isCollapsed ? styles.accordionBodyHidden : ''}`}
                        >
                          <div className={styles.fieldsGrid2}>
                            {/* Full Name */}
                            <div className={styles.formGroup}>
                              <label htmlFor={`member-${index}-name`} className={styles.fieldLabel}>
                                Full Name
                              </label>
                              <input
                                id={`member-${index}-name`}
                                type="text"
                                autoComplete={index === 0 ? 'name' : 'off'}
                                placeholder="e.g. Jane Doe"
                                className={`${styles.inputField} ${memberErrors?.fullName ? styles.hasError : ''}`}
                                aria-invalid={!!memberErrors?.fullName}
                                onFocus={handleInputFocus}
                                {...register(`members.${index}.fullName`)}
                              />
                            </div>

                            {/* Registration Number */}
                            <div className={styles.formGroup}>
                              <label htmlFor={`member-${index}-rollNo`} className={styles.fieldLabel}>
                                Registration Number
                              </label>
                              <input
                                id={`member-${index}-rollNo`}
                                type="text"
                                autoComplete="off"
                                placeholder="e.g. 210425205183"
                                className={`${styles.inputField} ${memberErrors?.rollNo ? styles.hasError : ''}`}
                                aria-invalid={!!memberErrors?.rollNo}
                                onFocus={handleInputFocus}
                                {...register(`members.${index}.rollNo`)}
                              />
                            </div>

                            {/* Email */}
                            <div className={styles.formGroup}>
                              <label htmlFor={`member-${index}-email`} className={styles.fieldLabel}>
                                College Email (@citchennai.net)
                              </label>
                              <input
                                id={`member-${index}-email`}
                                type="email"
                                autoComplete={index === 0 ? 'email' : 'off'}
                                placeholder="e.g. 2101001@citchennai.net"
                                className={`${styles.inputField} ${memberErrors?.email ? styles.hasError : ''}`}
                                aria-invalid={!!memberErrors?.email}
                                onFocus={handleInputFocus}
                                {...register(`members.${index}.email`)}
                              />
                            </div>

                            {/* Mobile Number */}
                            <div className={styles.formGroup}>
                              <label htmlFor={`member-${index}-phone`} className={styles.fieldLabel}>
                                Mobile Number (10 Digits)
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
                                onFocus={handleInputFocus}
                                {...register(`members.${index}.phone`, {
                                  onChange: (e) => {
                                    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    e.target.value = raw;
                                  },
                                })}
                              />
                            </div>

                            {/* Year of Study */}
                            <div className={styles.formGroup}>
                              <label htmlFor={`member-${index}-year`} className={styles.fieldLabel}>
                                Year of Study
                              </label>
                              <Controller
                                name={`members.${index}.year`}
                                control={control}
                                render={({ field }) => (
                                  <ColorOSDropdown
                                    id={`member-${index}-year`}
                                    value={field.value}
                                    onChange={(val) => {
                                      field.onChange(val);
                                    }}
                                    options={YEAR_OPTIONS}
                                    hasError={!!memberErrors?.year}
                                    onFocus={handleInputFocus}
                                    onOpenChange={(open) => setOpenDropdownPlayer(open ? index : null)}
                                    ariaLabel="Year of Study"
                                  />
                                )}
                              />
                            </div>

                            {/* Department */}
                            <div className={styles.formGroup}>
                              <label htmlFor={`member-${index}-dept`} className={styles.fieldLabel}>
                                Department
                              </label>
                              <Controller
                                name={`members.${index}.department`}
                                control={control}
                                render={({ field }) => (
                                  <ColorOSDropdown
                                    id={`member-${index}-dept`}
                                    value={field.value}
                                    onChange={(val) => {
                                      field.onChange(val);
                                    }}
                                    options={DEPARTMENT_OPTIONS}
                                    hasError={!!memberErrors?.department}
                                    onFocus={handleInputFocus}
                                    onOpenChange={(open) => setOpenDropdownPlayer(open ? index : null)}
                                    ariaLabel="Department"
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {/* Clean Footer Bar */}
              <div className={styles.modalFooter}>
                <div className={styles.footerInfo}>
                  <span>
                    {activePricing.isPromo && <span style={{ textDecoration: 'line-through', opacity: 0.5, marginRight: '5px' }}>₹{activePricing.regularPair}</span>}
                    ₹{activePricing.pair} {activePricing.taxNote}
                  </span>
                  <span className={styles.footerSubText}>
                    {activePricing.isPromo
                      ? ' · National Education Day Offer (Closing Soon)'
                      : ' · Covers both members for both events'}
                  </span>
                </div>

                <div className={styles.footerButtons}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={handleModalClose}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>

                  <Button
                    type={pendingPayment ? "button" : "submit"}
                    onClick={pendingPayment ? () => onSubmit() : undefined}
                    variant="primary"
                    size="lg"
                    disabled={submitting || isClosed || (!pendingPayment && teamNameStatus === 'taken')}
                    className={styles.submitBtn}
                  >
                    {isClosed
                      ? (registrationsClosed ? 'Registrations Closed' : 'Registrations Full')
                      : submitting
                      ? 'Locking In...'
                      : (!pendingPayment && teamNameStatus === 'taken')
                      ? 'Codename Taken'
                      : pendingPayment
                      ? 'Retry Verification'
                      : `Lock In Duo · ₹${activePricing.pair}`}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
