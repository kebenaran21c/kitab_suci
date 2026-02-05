const fs = require('fs');
const path = require('path');

// window 객체 모의 생성
global.window = {};

// 파일 로드 함수
function loadDataFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    eval(fileContent);
    return window.KITAB_FULL_DATA;
}

// 데이터를 통일된 형식으로 변환 (챕터별 객체 -> 배열)
function normalizeData(data) {
    const normalized = {};

    Object.keys(data).forEach(bookName => {
        const bookData = data[bookName];

        // 챕터별 객체 구조인 경우 (원본 파일: {"1": [...], "2": [...]})
        if (typeof bookData === 'object' && !Array.isArray(bookData)) {
            normalized[bookName] = [];
            Object.keys(bookData).forEach(chapterNum => {
                normalized[bookName] = normalized[bookName].concat(bookData[chapterNum]);
            });
        }
        // 이미 배열인 경우 (수정 파일의 평탄화된 구조)
        else if (Array.isArray(bookData)) {
            normalized[bookName] = bookData;
        }
    });

    return normalized;
}

// 데이터 무결성 검증 함수
function verifyDataIntegrity(data, fileName) {
    console.log(`\n========== ${fileName} 검증 시작 ==========`);

    const stats = {
        totalBooks: 0,
        totalChapters: 0,
        totalVerses: 0,
        errors: [],
        warnings: []
    };

    if (!data || typeof data !== 'object') {
        stats.errors.push('데이터가 유효한 객체가 아닙니다');
        return stats;
    }

    // 데이터 정규화
    const normalizedData = normalizeData(data);
    const books = Object.keys(normalizedData);
    stats.totalBooks = books.length;

    books.forEach(bookName => {
        const verses = normalizedData[bookName];

        if (!Array.isArray(verses)) {
            stats.errors.push(`${bookName}: 절 데이터가 배열이 아닙니다`);
            return;
        }

        // 챕터별 절 그룹화
        const chapterGroups = {};
        verses.forEach(verse => {
            if (!verse.ref) {
                stats.errors.push(`${bookName}: 참조(ref) 필드가 없는 절이 있습니다`);
                return;
            }

            const refMatch = verse.ref.match(/(\d+):(\d+)/);
            if (!refMatch) {
                stats.errors.push(`${bookName}: 잘못된 참조 형식 - ${verse.ref}`);
                return;
            }

            const chapterNum = parseInt(refMatch[1]);
            const verseNum = parseInt(refMatch[2]);

            if (!chapterGroups[chapterNum]) {
                chapterGroups[chapterNum] = [];
            }

            chapterGroups[chapterNum].push({
                verseNum,
                ref: verse.ref,
                ar: verse.ar,
                id: verse.id
            });
        });

        const chapterNums = Object.keys(chapterGroups).map(Number).sort((a, b) => a - b);
        stats.totalChapters += chapterNums.length;

        // 각 챕터의 절 순서 검증
        chapterNums.forEach(chapterNum => {
            const chapterVerses = chapterGroups[chapterNum];
            const verseNums = chapterVerses.map(v => v.verseNum).sort((a, b) => a - b);
            stats.totalVerses += verseNums.length;

            // 절 번호 연속성 검증
            for (let i = 0; i < verseNums.length - 1; i++) {
                if (verseNums[i + 1] - verseNums[i] > 1) {
                    stats.warnings.push(
                        `${bookName} ${chapterNum}장: 절 ${verseNums[i]}에서 ${verseNums[i + 1]}로 건너김`
                    );
                }
            }

            // 중복 절 검증
            const duplicates = verseNums.filter((num, idx) => verseNums.indexOf(num) !== idx);
            if (duplicates.length > 0) {
                stats.errors.push(
                    `${bookName} ${chapterNum}장: 중복된 절 번호 - ${[...new Set(duplicates)].join(', ')}`
                );
            }

            // 필수 필드 검증
            chapterVerses.forEach(verse => {
                if (!verse.ar || verse.ar.trim() === '') {
                    stats.errors.push(`${bookName} ${verse.ref}: 아랍어 텍스트(ar)가 비어있습니다`);
                }
                if (!verse.id || verse.id.trim() === '') {
                    stats.errors.push(`${bookName} ${verse.ref}: 인도네시아어 번역(id)이 비어있습니다`);
                }
            });
        });

        console.log(`  ${bookName}: ${chapterNums.length}개 챕터, ${verses.length}개 절`);
    });

    return stats;
}

// 두 데이터 파일 비교
function compareDataFiles(originalData, fixedData) {
    console.log('\n========== 원본 파일과 수정 파일 비교 ==========');

    const differences = [];

    // 데이터 정규화
    const normalizedOriginal = normalizeData(originalData);
    const normalizedFixed = normalizeData(fixedData);

    const originalBooks = Object.keys(normalizedOriginal).sort();
    const fixedBooks = Object.keys(normalizedFixed).sort();

    // 책 목록 비교
    const missingInFixed = originalBooks.filter(book => !fixedBooks.includes(book));
    const addedInFixed = fixedBooks.filter(book => !originalBooks.includes(book));

    if (missingInFixed.length > 0) {
        differences.push(`수정 파일에서 누락된 책: ${missingInFixed.join(', ')}`);
    }
    if (addedInFixed.length > 0) {
        differences.push(`수정 파일에 추가된 책: ${addedInFixed.join(', ')}`);
    }

    // 공통 책의 절 수 비교
    const commonBooks = originalBooks.filter(book => fixedBooks.includes(book));
    commonBooks.forEach(bookName => {
        const originalVerses = normalizedOriginal[bookName].length;
        const fixedVerses = normalizedFixed[bookName].length;

        if (originalVerses !== fixedVerses) {
            differences.push(
                `${bookName}: 절 수 불일치 (원본: ${originalVerses}, 수정: ${fixedVerses})`
            );
        }
    });

    return differences;
}

// 메인 실행
try {
    console.log('데이터 무결성 검증 시작...\n');

    // 파일 경로
    const originalPath = path.join(__dirname, 'database', 'kitab_full_data.js');
    const fixedPath = path.join(__dirname, 'database', 'kitab_full_data_fixed.js');

    // 원본 파일 로드 및 검증
    global.window = {};
    const originalData = loadDataFile(originalPath);
    const originalStats = verifyDataIntegrity(originalData, '원본 파일 (kitab_full_data.js)');

    // 수정 파일 로드 및 검증
    global.window = {};
    const fixedData = loadDataFile(fixedPath);
    const fixedStats = verifyDataIntegrity(fixedData, '수정 파일 (kitab_full_data_fixed.js)');

    // 비교
    const differences = compareDataFiles(originalData, fixedData);

    // 결과 출력
    console.log('\n========== 검증 결과 요약 ==========');
    console.log('\n[원본 파일]');
    console.log(`  총 책: ${originalStats.totalBooks}`);
    console.log(`  총 챕터: ${originalStats.totalChapters}`);
    console.log(`  총 절: ${originalStats.totalVerses}`);
    console.log(`  오류: ${originalStats.errors.length}개`);
    console.log(`  경고: ${originalStats.warnings.length}개`);

    console.log('\n[수정 파일]');
    console.log(`  총 책: ${fixedStats.totalBooks}`);
    console.log(`  총 챕터: ${fixedStats.totalChapters}`);
    console.log(`  총 절: ${fixedStats.totalVerses}`);
    console.log(`  오류: ${fixedStats.errors.length}개`);
    console.log(`  경고: ${fixedStats.warnings.length}개`);

    console.log('\n[파일 간 차이점]');
    if (differences.length === 0) {
        console.log('  차이점 없음 - 두 파일의 구조가 동일합니다');
    } else {
        differences.forEach(diff => console.log(`  - ${diff}`));
    }

    // 상세 오류 출력
    if (originalStats.errors.length > 0) {
        console.log('\n[원본 파일 오류 상세]');
        originalStats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
        if (originalStats.errors.length > 10) {
            console.log(`  ... 외 ${originalStats.errors.length - 10}개 오류`);
        }
    }

    if (fixedStats.errors.length > 0) {
        console.log('\n[수정 파일 오류 상세]');
        fixedStats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
        if (fixedStats.errors.length > 10) {
            console.log(`  ... 외 ${fixedStats.errors.length - 10}개 오류`);
        }
    }

    // 경고 출력 (처음 5개만)
    if (fixedStats.warnings.length > 0) {
        console.log('\n[수정 파일 경고 (처음 5개)]');
        fixedStats.warnings.slice(0, 5).forEach(warn => console.log(`  - ${warn}`));
        if (fixedStats.warnings.length > 5) {
            console.log(`  ... 외 ${fixedStats.warnings.length - 5}개 경고`);
        }
    }

    console.log('\n========================================\n');

    // 종료 코드 설정
    if (fixedStats.errors.length > 0 || differences.length > 0) {
        console.log('⚠️  검증 실패: 오류 또는 차이점이 발견되었습니다.');
        process.exit(1);
    } else {
        console.log('✅ 검증 성공: 데이터 무결성 확인 완료');
        process.exit(0);
    }

} catch (error) {
    console.error('검증 중 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
}
