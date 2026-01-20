'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from './page.module.css';

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
        userId: '',
        password: '',
        passwordConfirm: '',
    });
    const [isIdVerified, setIsIdVerified] = useState(false);

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

        if (!formData.userId.trim()) {
            alert('아이디를 입력해주세요.');
            return;
        }

        if (!isIdVerified) {
            alert('아이디 중복 확인을 해주세요.');
            return;
        }

        if (formData.password.length < 4) {
            alert('비밀번호는 4자 이상이어야 합니다.');
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            const payload = {
                employeeNum: formData.userId,
                password: formData.password,
                username: formData.name,
                department: formData.department,
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
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.signupWrapper}>
                <div className={styles.header}>
                    <div className={styles.logoContainer}>
                        <Image
                            src="/logo.png"
                            alt="한국환경공단 로고"
                            className={styles.logo}
                            priority
                            width={210}
                            height={48}
                        />
                    </div>
                </div>

                <div className={styles.signupForm}>
                    <h1 className={styles.title}>회원가입</h1>

                    <div className={styles.agreementSection}>
                        <h2 className={styles.sectionTitle}>개인정보 및 약관 동의 내용</h2>
                        <div className={styles.agreementList}>
                            <label className={styles.agreementItem}>
                                <input
                                    type="checkbox"
                                    checked={agreements.personalInfo}
                                    onChange={() => handleAgreementChange('personalInfo')}
                                    className={styles.checkbox}
                                />
                                <span>개인정보 처리방침 동의</span>
                                <button type="button" className={styles.agreeButton}>동의함</button>
                            </label>
                            <label className={styles.agreementItem}>
                                <input
                                    type="checkbox"
                                    checked={agreements.terms}
                                    onChange={() => handleAgreementChange('terms')}
                                    className={styles.checkbox}
                                />
                                <span>서비스 이용약관 동의</span>
                                <button type="button" className={styles.agreeButton}>동의함</button>
                            </label>
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

                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="부서"
                                    value={formData.department}
                                    onChange={(e) => handleInputChange('department', e.target.value)}
                                />
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
                                {formData.password && formData.passwordConfirm && (
                                    <p className={styles.passwordMatch}>
                                        {formData.password === formData.passwordConfirm
                                            ? '비밀번호가 일치합니다.'
                                            : '비밀번호가 일치하지 않습니다.'}
                                    </p>
                                )}
                            </div>

                            <button type="submit" className={styles.signupButton}>
                                회원가입
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
