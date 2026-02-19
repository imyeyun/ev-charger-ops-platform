'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from './page.module.css';

import { SERVICE_TEXT } from '@/app/legal/service';
import { PRIVACY_TEXT } from '@/app/legal/privacy';

function normalizeText(v) {
    return String(v || "").trim().toLowerCase();
}

function hasSequentialChars(s, len = 4) {
    // 예: 1234, abcd 같은 증가/감소 연속 패턴 체크
    for (let i = 0; i <= s.length - len; i++) {
        let inc = true;
        let dec = true;
        for (let j = 1; j < len; j++) {
            const a = s.charCodeAt(i + j - 1);
            const b = s.charCodeAt(i + j);
            if (b !== a + 1) inc = false;
            if (b !== a - 1) dec = false;
        }
        if (inc || dec) return true;
    }
    return false;
}

function validatePassword(pw, ctx) {
    const password = String(pw || "");

    // 1) 길이 (이미 handleSubmit에서 체크해도 되지만, 여기서도 안전하게)
    if (password.length < 8 || password.length > 20) {
        return "비밀번호는 8자 이상 20자 미만이어야 합니다.";
    }

    // 2) 문자 종류 2개 이상(대문자/소문자/숫자/특수문자)
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const typeCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

    if (typeCount < 2) {
        return "비밀번호는 대문자/소문자/숫자/특수문자 중 2종류 이상을 포함해야 합니다.";
    }

    // 3) 숫자만/문자만 등 단순 구성 방지
    if (/^\d+$/.test(password)) return "비밀번호를 숫자만으로 설정할 수 없습니다.";
    if (/^[A-Za-z]+$/.test(password)) return "비밀번호를 영문자만으로 설정할 수 없습니다.";

    // 4) 동일 문자 반복(예: 123123, aaaa 등) - 간단히 4회 이상 연속 반복 금지
    if (/(.)\1\1\1/.test(password)) {
        return "동일 문자를 반복한 비밀번호는 사용할 수 없습니다.";
    }

    // 5) 연속 패턴(예: 1234, abcd)
    if (hasSequentialChars(password, 4)) {
        return "연속된 패턴(예: 1234, abcd)이 포함된 비밀번호는 사용할 수 없습니다.";
    }

    // 6) 키보드 연속 배치(예: qwerty, asdf)
    const lower = password.toLowerCase();
    const keyboardPatterns = ["qwerty", "asdf", "zxcv", "12345", "password"];
    if (keyboardPatterns.some((p) => lower.includes(p))) {
        return "키보드 연속 배치(예: qwerty) 또는 너무 흔한 단어가 포함된 비밀번호는 사용할 수 없습니다.";
    }

    // 7) 개인정보/ID 포함 금지 (이름/아이디/부서/직급)
    const name = normalizeText(ctx?.name);
    const userId = normalizeText(ctx?.userId);
    const department = normalizeText(ctx?.department);
    const rank = normalizeText(ctx?.rank);

    const pwNorm = normalizeText(password);

    // 길이가 너무 짧은 값(예: 한 글자)은 오탐이 많아서 2~3자 이상만 검사
    const blocks = [name, userId, department, rank].filter((x) => x && x.length >= 3);
    if (blocks.some((x) => pwNorm.includes(x))) {
        return "이름/아이디/부서/직급 등 개인정보가 포함된 비밀번호는 사용할 수 없습니다.";
    }

    // 8) 아이디를 그대로 비밀번호로 쓰는 경우
    if (userId && pwNorm === userId) {
        return "아이디와 동일한 비밀번호는 사용할 수 없습니다.";
    }

    return "";
}

export default function Signup() {
    const router = useRouter();
    const [agreements, setAgreements] = useState({
        personalInfo: false,
        terms: false,
        all: false,
    });
    const [formData, setFormData] = useState({
        name: '',
        department: '',
        rank: '',
        userId: '',
        password: '',
        passwordConfirm: '',
    });
    const [isIdVerified, setIsIdVerified] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ✅ 두 개 모두 체크되어야만 true
    const canSubmit = useMemo(
        () => agreements.personalInfo && agreements.terms,
        [agreements.personalInfo, agreements.terms]
    );

    const handleAgreementChange = (type) => {
        if (type === 'all') {
            const newValue = !agreements.all;
            setAgreements({
                personalInfo: newValue,
                terms: newValue,
                all: newValue,
            });
        } else {
            const newAgreements = {
                ...agreements,
                [type]: !agreements[type],
            };
            newAgreements.all = newAgreements.personalInfo && newAgreements.terms;
            setAgreements(newAgreements);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleIdVerification = () => {
        if (!formData.userId.trim()) {
            alert('아이디를 입력해주세요.');
            return;
        }
        setIsIdVerified(true);
        alert('사용 가능한 아이디입니다.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // (disabled라 보통 여기까지 안 오지만, 혹시 몰라 2중 안전장치)
        if (!agreements.personalInfo || !agreements.terms) {
            alert('개인정보 및 약관에 동의해주세요.');
            return;
        }

        if (!formData.name.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }

        if (!formData.department.trim()) {
            alert('부서를 입력해주세요.');
            return;
        }

        if (!formData.rank.trim()) {
            alert('직급을 입력해주세요.');
            return;
        }

        if (!formData.userId.trim()) {
            alert('아이디를 입력해주세요.');
            return;
        }

        if (!isIdVerified) {
            alert('아이디 중복 확인을 해주세요.');
            return;
        }

        const pwMsg = validatePassword(formData.password, {
            name: formData.name,
            userId: formData.userId,
            department: formData.department,
            rank: formData.rank,
        });

        if (pwMsg) {
            alert(pwMsg);
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                employeeNum: formData.userId,
                password: formData.password,
                username: formData.name,
                department: String(formData.department)+String('-')+String(formData.rank),
            };

            await axios.post('/api/authApi/signup', payload, {
                headers: { 'Content-Type': 'application/json' },
            });

            alert('회원가입이 완료되었습니다.');
            router.push('/pages/login');
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                '회원가입에 실패했습니다.';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>            
        {/* ✅ [추가] 회원가입 중 스피너 */}
            {submitting && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(255,255,255,0.65)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            border: "3px solid #cfe3ff",
                            borderTopColor: "#2196f3",
                            animation: "spin 0.8s linear infinite",
                        }}
                    />
                    <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
                </div>
            )}

            <div className={styles.signupWrapper}>
                <div className={styles.header}>
                    <div className={styles.logoContainer}>
                        <Image
                            src="/logo2.svg"
                            alt="한국환경공단 로고"
                            className={styles.logo}
                            priority
                            width={307}
                            height={44}
                        />
                    </div>
                </div>

                <div className={styles.signupForm}>
                    <h1 className={styles.title}>회원가입</h1>

                    <div className={styles.agreementSection}>
                        <h2 className={styles.sectionTitle}>개인정보 및 약관 동의 내용</h2>

                        <div className={styles.agreementList}>
                            {/* 개인정보처리방침 */}
                            <div className={styles.agreementBlock}>
                                <div className={styles.agreementBox} aria-label="개인정보처리방침">
                                    <pre className={styles.agreementText}>{PRIVACY_TEXT}</pre>
                                </div>

                                <label className={styles.agreementItem} style={{ marginTop: 8 }}>
                                    <input
                                        type="checkbox"
                                        checked={agreements.personalInfo}
                                        onChange={() => handleAgreementChange('personalInfo')}
                                        className={styles.checkbox}
                                    />
                                    <span>개인정보 처리방침 동의 (필수)</span>
                                </label>
                            </div>

                            {/* 서비스 이용약관 */}
                            <div className={styles.agreementBlock}>
                                <div className={styles.agreementBox} aria-label="서비스 이용약관">
                                    <pre className={styles.agreementText}>{SERVICE_TEXT}</pre>
                                </div>

                                <label className={styles.agreementItem} style={{ marginTop: 8 }}>
                                    <input
                                        type="checkbox"
                                        checked={agreements.terms}
                                        onChange={() => handleAgreementChange('terms')}
                                        className={styles.checkbox}
                                    />
                                    <span>서비스 이용약관 동의 (필수)</span>
                                </label>
                            </div>

                            {/* 전체 동의 */}
                            <label className={styles.agreementItem}>
                                <input
                                    type="checkbox"
                                    checked={agreements.all}
                                    onChange={() => handleAgreementChange('all')}
                                    className={styles.checkbox}
                                />
                                <span className={styles.allAgreeText}>전체 동의함</span>
                            </label>
                        </div>
                    </div>

                    <div className={styles.inputSection}>
                        <h2 className={styles.sectionTitle}>개인정보 입력</h2>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="이름"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                />
                            </div>

                            <div className={styles.inputRowHalf}>
                                <select
                                    className={styles.input}
                                    value={formData.department}
                                    onChange={(e) => handleInputChange('department', e.target.value)}
                                >
                                    <option value="" disabled>
                                        부서
                                    </option>
                                    <option value="충전인프라사업부">충전인프라사업부</option>
                                    <option value="충전인프라지원부">충전인프라지원부</option>
                                </select>
                                <select
                                    className={styles.input}
                                    value={formData.rank}
                                    onChange={(e) => handleInputChange('rank', e.target.value)}
                                >
                                    <option value="" disabled>
                                        직급
                                    </option>
                                    <option value="부장">부장</option>
                                    <option value="과장">과장</option>
                                    <option value="차장">차장</option>
                                    <option value="대리">대리</option>
                                    <option value="주임">주임</option>
                                    <option value="사원">사원</option>
                                    <option value="인턴">인턴</option>
                                </select>
                            </div>

                            <div className={styles.inputGroupWithButton}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="아이디(사번입력)"
                                    value={formData.userId}
                                    onChange={(e) => {
                                        handleInputChange('userId', e.target.value);
                                        setIsIdVerified(false);
                                    }}
                                />
                                <button
                                    type="button"
                                    className={styles.verifyButton}
                                    onClick={handleIdVerification}
                                >
                                    인증
                                </button>
                            </div>

                            {/* 비밀번호 조건 안내: 항상 표시 */}
                            <div className={styles.passwordRule}>
                                <div>비밀번호 조건</div>
                                <ul>
                                    <li>8~20자 사이</li>
                                    <li>영어 대/소문자, 숫자, 특수문자 중 2종류 이상</li>
                                    <li>3번 이상 반복되는 문자 또는 연속적인 문자 사용 불가</li>
                                </ul>
                            </div>

                            <div className={styles.inputGroup}>
                                <input
                                    type="password"
                                    className={styles.input}
                                    placeholder="비밀번호"
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <input
                                    type="password"
                                    className={styles.input}
                                    placeholder="비밀번호 확인"
                                    value={formData.passwordConfirm}
                                    onChange={(e) => handleInputChange('passwordConfirm', e.target.value)}
                                />
                            </div>

                            {/* “일치/불일치” 문구 유지 + 아래쪽 배치 */}
                            {formData.password && formData.passwordConfirm && (
                                <p className={styles.passwordMatch}>
                                    {formData.password === formData.passwordConfirm
                                        ? '비밀번호가 일치합니다.'
                                        : '비밀번호가 일치하지 않습니다.'}
                                </p>
                            )}
                            <button
                                type="submit"
                                className={`${styles.signupButton} ${!canSubmit ? styles.signupButtonDisabled : ''}`}
                                disabled={!canSubmit || submitting}
                                aria-disabled={!canSubmit || submitting}
                            >
                                회원가입
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}