// client/src/components/Events/GoatTerminalVisual.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './Events.module.css';

const COMMAND_TEXT = './reverse_engineer --test';
const SAMPLE_ROWS = [
  { input: '[12, 5, 8, 19, 3]', output: '39' },
  { input: '[4, 4, 4, 4]', output: '16' },
  { input: '[100, 25, -10]', output: '115' },
];

export default function GoatTerminalVisual() {
  const [typedCmd, setTypedCmd] = useState('');
  const [visibleCount, setVisibleCount] = useState(0);
  const [evaluatingRow, setEvaluatingRow] = useState(-1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cycle, setCycle] = useState(0);

  const timerRef = useRef([]);

  const clearAllTimers = () => {
    timerRef.current.forEach((t) => clearTimeout(t));
    timerRef.current = [];
  };

  const handleRerun = () => {
    clearAllTimers();
    setCycle((c) => c + 1);
  };

  useEffect(() => {
    clearAllTimers();
    setTypedCmd('');
    setVisibleCount(0);
    setEvaluatingRow(-1);
    setIsCompleted(false);

    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setTypedCmd(COMMAND_TEXT);
      setVisibleCount(SAMPLE_ROWS.length);
      setIsCompleted(true);
      return;
    }

    // Step 1: Type out command character by character
    let currentText = '';
    const typeSpeed = 38;
    for (let i = 0; i < COMMAND_TEXT.length; i++) {
      const t = setTimeout(() => {
        currentText += COMMAND_TEXT[i];
        setTypedCmd(currentText);
      }, (i + 1) * typeSpeed);
      timerRef.current.push(t);
    }

    const commandDoneTime = (COMMAND_TEXT.length + 1) * typeSpeed + 260;

    // Step 2: Stream in each sample testcase row sequentially
    SAMPLE_ROWS.forEach((_, idx) => {
      // Row starts evaluating
      const evalTimer = setTimeout(() => {
        setEvaluatingRow(idx);
      }, commandDoneTime + idx * 600);
      timerRef.current.push(evalTimer);

      // Row resolves to expected output
      const rowTimer = setTimeout(() => {
        setVisibleCount(idx + 1);
        setEvaluatingRow(-1);
      }, commandDoneTime + idx * 600 + 400);
      timerRef.current.push(rowTimer);
    });

    // Step 3: Complete cycle
    const completeTime = commandDoneTime + SAMPLE_ROWS.length * 600 + 450;
    const completeTimer = setTimeout(() => {
      setIsCompleted(true);
    }, completeTime);
    timerRef.current.push(completeTimer);

    // Step 4: Auto-loop after a comfortable viewing pause (7s)
    const loopTimer = setTimeout(() => {
      setCycle((c) => c + 1);
    }, completeTime + 7000);
    timerRef.current.push(loopTimer);

    return () => clearAllTimers();
  }, [cycle]);

  return (
    <div className={styles.terminalCard}>
      {/* Window bar with three status dots & interactive Re-run button */}
      <div className={styles.terminalBar}>
        <div className={styles.terminalDots} aria-hidden="true">
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
        <div className={styles.terminalBarCenter}>
          <span className={styles.terminalBadge}>BLACK BOX EVALUATOR</span>
        </div>
        <button
          type="button"
          className={styles.terminalRerunBtn}
          onClick={handleRerun}
          title="Re-run black box test evaluation"
          aria-label="Re-run black box test evaluation"
        >
          <span className={styles.terminalRerunIcon}>↺</span>
          <span className={styles.terminalRerunText}>Run</span>
        </button>
      </div>

      {/* Terminal prompt bar with active typing & cursor */}
      <div className={styles.terminalCommandLine}>
        <span className={styles.terminalPromptUser}>coder@deadlock:~$</span>
        <span className={styles.terminalPromptCmd}>{typedCmd}</span>
        <span className={styles.cursorBlink} aria-hidden="true" />
      </div>

      {/* Monospace table of raw input/output test cases */}
      <div className={styles.terminalTableWrapper}>
        <table className={styles.terminalTable}>
          <thead>
            <tr>
              <th scope="col">SAMPLE INPUT</th>
              <th scope="col">EXPECTED OUTPUT</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((row, idx) => {
              const isVisible = visibleCount > idx;
              const isEvaluating = evaluatingRow === idx;

              return (
                <tr
                  key={idx}
                  className={isVisible ? styles.terminalRowActive : styles.terminalRowPending}
                >
                  <td>
                    <code className={styles.sampleInput}>{row.input}</code>
                  </td>
                  <td>
                    {isVisible ? (
                      <div className={styles.outputCell}>
                        <code className={styles.sampleOutput}>{row.output}</code>
                        <span className={styles.passTag}>
                          <span className={styles.passCheck}>✓</span> MATCH
                        </span>
                      </div>
                    ) : isEvaluating ? (
                      <span className={styles.evaluatingText}>
                        <span className={styles.spinnerInline} /> computing...
                      </span>
                    ) : (
                      <span className={styles.waitingDot}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer explicitly stating ONLY RAW I/O IS PROVIDED (No complexity provided) */}
      <div className={styles.terminalFooter}>
        <div className={styles.terminalNotice}>
          <span className={styles.terminalNoticeLed} aria-hidden="true" />
          <span className={styles.complexityText}>
            {isCompleted
              ? 'Raw I/O Only · No Complexity Provided · Deduce Algorithm'
              : 'Executing black-box input/output stream...'}
          </span>
        </div>
        <span className={styles.terminalStatusPill}>
          {isCompleted ? '3/3 EVAL' : 'RUNNING'}
        </span>
      </div>
    </div>
  );
}
