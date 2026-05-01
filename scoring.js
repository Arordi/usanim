// scoring.js

/**
 * Ստուգում է՝ արդյոք բառը համարվում է սովորած
 * - Եթե isInstant = true (Փուլ 1-ում սեղմվել է «Գիտեմ»)
 * - Կամ անցել է Փուլ 1-ը (stagesCompleted-ում կա 1) և
 *   Փուլ 2-6-ից յուրաքանչյուրի stageScores-ը >= 10
 */
function isWordLearned(word) {
    if (word.isInstant) return true;
    
    const requiredStages = [2, 3, 4, 5, 6];
    const stage1Completed = word.stagesCompleted.includes(1);
    const higherStagesCompleted = requiredStages.every(s => 
        (word.stageScores && word.stageScores[s] >= 10)
    );
    
    return stage1Completed && higherStagesCompleted;
}

/**
 * Հաշվարկում է հաջորդ կրկնության օրը (Spaced Repetition)
 */
function setNextRep(word) {
    const intervals = [7, 30, 90];
    const days = intervals[word.repLevel] || 90;
    let date = new Date();
    date.setDate(date.getDate() + days);
    word.nextRepDate = date.toISOString().split('T')[0];
    word.repLevel++;
}

/**
 * Պահպանում է առաջընթացը LocalStorage-ում
 * Բանալին ներառում է մակարդակը (currentLevel)
 */
function saveProgress(words, examScores, dailyWordsCount, dailyGoal, dailyTimeData, reminderMinute) {
    const storage = {
        words: {},
        examScores,
        dailyWordsCount,
        dailyGoal,
        dailyTimeData,
        reminderMinute
    };
    
    words.forEach(w => {
        storage.words[w.id] = {
            stageScores: w.stageScores || {},
            stagesCompleted: w.stagesCompleted || [],
            isInstant: w.isInstant || false,
            isSeen: w.isSeen || false,
            errorCount: w.errorCount || 0,
            learnedDate: w.learnedDate || null,
            repLevel: w.repLevel || 0,
            nextRepDate: w.nextRepDate || null
        };
    });
    
    // ԿԱՐԵՎՈՐ. բանալին պետք է համընկնի main-ի storageKey-ի հետ
    localStorage.setItem('usanim_v3_data_' + currentLevel, JSON.stringify(storage));
}

/**
 * Միավորների ավելացում ճիշտ պատասխանի դեպքում
 * @param {Object} word - բառի օբյեկտ
 * @param {number} stage - փուլի համարը (1-7)
 * @param {string|null} mode - smartMode (միայն 7-րդ փուլի համար)
 * @returns {Object} արդյունք { stageFinished, learnedNew }
 */
function handleCorrectAnswer(word, stage, mode = null) {
    if (!word.stageScores) word.stageScores = {};
    if (!word.stagesCompleted) word.stagesCompleted = [];
    
    // === ՓՈՒԼ 1 (առանց միավորների) ===
    if (stage === 1) {
        // Նշել, որ փուլն ավարտված է (եթե դեռ նշված չէ)
        if (!word.stagesCompleted.includes(1)) {
            word.stagesCompleted.push(1);
        }
        // Փուլ 1-ը երբեք միավորներ չի պահանջում, պարզապես ավարտված է
        return { stageFinished: true, learnedNew: false };
    }
    
    // === ՄՆԱՑԱԾ ՓՈՒԼԵՐ (2-7) ===
    if (word.stageScores[stage] === undefined) {
        word.stageScores[stage] = 0;
    }
    
    if (word.stageScores[stage] < 10) {
        word.stageScores[stage]++;
    }
    
    // Ստուգել՝ արդյոք տվյալ փուլի միավորը հասել է 10-ի
    if (word.stageScores[stage] >= 10) {
        if (stage >= 2 && stage <= 6) {
            if (!word.stagesCompleted.includes(stage)) {
                word.stagesCompleted.push(stage);
            }
            
            // Ստուգել՝ արդյոք բառն ամբողջությամբ սովորած է
            if (isWordLearned(word)) {
                if (!word.learnedDate) {
                    word.learnedDate = new Date().toISOString().split('T')[0];
                    setNextRep(word);
                    return { stageFinished: true, learnedNew: true };
                }
            }
            return { stageFinished: true, learnedNew: false };
        } else if (stage === 7) {
            // Փուլ 7 (կրկնություն/դժվար բառեր)
            if (mode === 'repetition') {
                setNextRep(word);
            }
            return { stageFinished: true, learnedNew: false };
        }
    }
    
    return { stageFinished: false, learnedNew: false };
}

/**
 * Սխալ պատասխանի դեպքում միավորի նվազեցում
 * @param {Object} word
 * @param {number} stage
 * @returns {Object} { showTranslation }
 */
function handleWrongAnswer(word, stage) {
    if (!word.stageScores) word.stageScores = {};
    if (!word.stagesCompleted) word.stagesCompleted = [];
    
    // Փուլ 1-ում միավորներ չկան, միայն errorCount-ն է ավելանում
    if (stage === 1) {
        word.errorCount++;
        return { showTranslation: false };
    }
    
    if (word.stageScores[stage] === undefined) {
        word.stageScores[stage] = 0;
    }
    
    // Նվազեցնել միավորը (բայց 0-ից ցածր չի իջնում)
    word.stageScores[stage] = Math.max(0, word.stageScores[stage] - 1);
    word.errorCount++;
    
    return { showTranslation: false };
}
