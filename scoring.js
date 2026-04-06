// scoring.js

// Ստուգում է՝ արդյոք բառը համարվում է սովորած
function isWordLearned(word) {
    if (word.isInstant) return true;
    // Բառը սովորած է, եթե անցել է 2, 3, 4, 5, 6 փուլերը
    // Ամեն փուլ պետք է ունենա 10 միավոր կամ լինի stagesCompleted ցուցակում
    return [2, 3, 4, 5, 6].every(s => 
        word.stagesCompleted.includes(s) || (word.stageScores && word.stageScores[s] >= 10)
    );
}

// Հաշվարկում է հաջորդ կրկնության օրը (Spaced Repetition)
function setNextRep(word) {
    const intervals = [7, 30, 90];
    const days = intervals[word.repLevel] || 90;
    let date = new Date();
    date.setDate(date.getDate() + days);
    word.nextRepDate = date.toISOString().split('T')[0];
    word.repLevel++;
}

// Պահպանում է առաջընթացը LocalStorage-ում
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
            // Պահպանում ենք անհատական միավորները ամեն փուլի աստղի համար
            stageScores: w.stageScores || {}, 
            stagesCompleted: w.stagesCompleted, 
            isInstant: w.isInstant, 
            isSeen: w.isSeen, 
            errorCount: w.errorCount, 
            learnedDate: w.learnedDate,
            repLevel: w.repLevel, 
            nextRepDate: w.nextRepDate
        };
    });
    localStorage.setItem('usanim_v3_data', JSON.stringify(storage));
}

// Միավորների ավելացման ընդհանուր ֆունկցիա
function handleCorrectAnswer(word, stage, mode = null) {
    // Սկզբնավորել stageScores օբյեկտը, եթե գոյություն չունի
    if (!word.stageScores) {
        word.stageScores = {};
    }
    
    // Եթե այս փուլի համար դեռ միավոր չի գրանցվել, սահմանել 0
    if (word.stageScores[stage] === undefined) {
        word.stageScores[stage] = 0;
    }

    // Ավելացնել միավորը միայն տվյալ փուլի համար (մինչև 10)
    if (word.stageScores[stage] < 10) {
        word.stageScores[stage]++;
    }
    
    // Ստուգել՝ արդյոք տվյալ փուլի 10 միավորը լրացավ
    if (word.stageScores[stage] >= 10) {
        // 7-րդ փուլը անկախ է
        if (stage !== 7) {
            // Ավելացնել ավարտված փուլերի ցուցակում, եթե չկա
            if (!word.stagesCompleted.includes(stage)) {
                word.stagesCompleted.push(stage);
            }

            // Ստուգել՝ արդյոք 2-6 փուլերը փակվեցին
            if (isWordLearned(word)) {
                // Եթե բառը նոր է համարվում սովորած
                if (!word.learnedDate) {
                    word.learnedDate = new Date().toISOString().split('T')[0];
                    setNextRep(word);
                    return { stageFinished: true, learnedNew: true };
                }
            }
        } else {
            // Փուլ 7-ի դեպքում (Կրկնություն)
            if (mode === 'repetition') {
                setNextRep(word);
            }
        }
        return { stageFinished: true, learnedNew: false };
    }
    
    return { stageFinished: false, learnedNew: false };
}

// Սխալ պատասխանի դեպքում միավորի նվազեցում տվյալ փուլի աստղից
function handleWrongAnswer(word, stage) {
    if (!word.stageScores) {
        word.stageScores = {};
    }
    if (word.stageScores[stage] === undefined) {
        word.stageScores[stage] = 0;
    }

    // Նվազեցնել միավորը միայն տվյալ փուլի սահմաններում
    word.stageScores[stage] = Math.max(0, word.stageScores[stage] - 1);
    word.errorCount++;
}
