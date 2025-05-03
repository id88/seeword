class WordMemoryApp {
    constructor() {
        this.words = {};
        this.currentWord = null;
        this.currentOptions = [];
        this.mode = 'en'; // 'en' 或 'cn'
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.wordDisplay = document.getElementById('word-display');
        this.optionsContainer = document.getElementById('options');
        this.modeEnBtn = document.getElementById('mode-en');
        this.modeCnBtn = document.getElementById('mode-cn');
        this.dontKnowBtn = document.getElementById('dont-know');
        this.tooEasyBtn = document.getElementById('too-easy');
        this.resetScoresBtn = document.getElementById('reset-scores');
        this.exportDataBtn = document.getElementById('export-data');
        this.importDataBtn = document.getElementById('import-data');
        this.importFileInput = document.getElementById('import-file');
        this.statsInfo = document.getElementById('stats-info');
    }

    bindEvents() {
        this.modeEnBtn.addEventListener('click', () => this.switchMode('en'));
        this.modeCnBtn.addEventListener('click', () => this.switchMode('cn'));
        this.dontKnowBtn.addEventListener('click', () => this.handleDontKnow());
        this.tooEasyBtn.addEventListener('click', () => this.handleTooEasy());
        this.resetScoresBtn.addEventListener('click', () => this.resetScores());
        this.exportDataBtn.addEventListener('click', () => this.exportData());
        this.importDataBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this.handleFileImport(e));
    }

    updateStats() {
        // 使用Map来动态统计所有可能的分值
        const stats = new Map();
        
        // 统计所有单词的分值
        Object.values(this.words).forEach(word => {
            const score = word[this.mode];
            stats.set(score, (stats.get(score) || 0) + 1);
        });

        // 将统计结果转换为数组并排序
        const sortedStats = Array.from(stats.entries())
            .sort((a, b) => a[0] - b[0]);

        // 生成显示文本
        const statsText = sortedStats
            .map(([score, count]) => `${score}分: ${count}个`)
            .join(' | ');

        this.statsInfo.textContent = `当前分值分布: ${statsText}`;
    }

    switchMode(mode) {
        this.mode = mode;
        this.modeEnBtn.classList.toggle('active', mode === 'en');
        this.modeCnBtn.classList.toggle('active', mode === 'cn');
        this.nextWord();
        this.updateStats();
    }

    async loadWords() {
        try {
            const response = await fetch('data/words.json');
            this.words = await response.json();
            this.nextWord();
        } catch (error) {
            console.error('加载单词数据失败:', error);
            alert('加载单词数据失败，请确保data/words.json文件存在');
        }
    }

    getRandomWord() {
        const availableWords = Object.entries(this.words)
            .filter(([_, data]) => data[this.mode] > 0)
            .map(([word, data]) => ({ word, ...data }));

        if (availableWords.length === 0) {
            return null;
        }

        const totalScore = availableWords.reduce((sum, word) => sum + word[this.mode], 0);
        let random = Math.random() * totalScore;
        
        for (const word of availableWords) {
            random -= word[this.mode];
            if (random <= 0) {
                return word;
            }
        }
        
        return availableWords[0];
    }

    getRandomOptions(correctWord) {
        const allWords = Object.entries(this.words)
            .filter(([word]) => word !== correctWord.word)
            .map(([word, data]) => ({ word, chinese: data.chinese }));
        
        const options = [correctWord];
        while (options.length < 4 && allWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * allWords.length);
            options.push(allWords[randomIndex]);
            allWords.splice(randomIndex, 1);
        }
        
        return this.shuffleArray(options);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    nextWord() {
        this.currentWord = this.getRandomWord();
        if (!this.currentWord) {
            this.wordDisplay.textContent = '没有可用的单词了！';
            this.optionsContainer.innerHTML = '';
            return;
        }

        this.currentOptions = this.getRandomOptions(this.currentWord);
        this.displayWord();
    }

    displayWord() {
        this.wordDisplay.textContent = this.mode === 'en' 
            ? this.currentWord.word 
            : this.currentWord.chinese;

        // 在英文模式下自动播放单词发音
        if (this.mode === 'en') {
            const audio = new Audio(`http://dict.youdao.com/dictvoice?type=2&audio=${this.currentWord.word}`);
            audio.play().catch(error => {
                console.error('播放音频失败:', error);
            });
        }

        this.optionsContainer.innerHTML = '';
        this.currentOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = this.mode === 'en' ? option.chinese : option.word;
            button.addEventListener('click', () => this.handleOptionClick(option));
            this.optionsContainer.appendChild(button);
        });
    }

    handleOptionClick(option) {
        const isCorrect = option.word === this.currentWord.word;
        const buttons = this.optionsContainer.querySelectorAll('.option-btn');
        
        buttons.forEach(btn => {
            const btnOption = this.currentOptions.find(opt => 
                (this.mode === 'en' ? opt.chinese : opt.word) === btn.textContent
            );
            if (btnOption.word === this.currentWord.word) {
                btn.classList.add('correct');
            } else if (btnOption.word === option.word && !isCorrect) {
                btn.classList.add('wrong');
            }
        });

        if (isCorrect) {
            this.words[this.currentWord.word][this.mode]--;
        }

        this.updateStats();
        setTimeout(() => this.nextWord(), 1500);
    }

    handleDontKnow() {
        this.words[this.currentWord.word][this.mode]++;
        this.showCorrectAnswer();
        this.updateStats();
    }

    handleTooEasy() {
        this.words[this.currentWord.word][this.mode] = 0;
        this.showCorrectAnswer();
        this.updateStats();
    }

    showCorrectAnswer() {
        const buttons = this.optionsContainer.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            const btnOption = this.currentOptions.find(opt => 
                (this.mode === 'en' ? opt.chinese : opt.word) === btn.textContent
            );
            if (btnOption.word === this.currentWord.word) {
                btn.classList.add('correct');
            }
        });
        setTimeout(() => this.nextWord(), 1500);
    }

    resetScores() {
        Object.values(this.words).forEach(word => {
            word.en = 5;
            word.cn = 5;
        });
        this.nextWord();
        this.updateStats();
    }

    exportData() {
        const dataStr = JSON.stringify(this.words, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // 生成日期时间格式的文件名
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const fileName = `${year}${month}${day}${hours}${minutes}${seconds}.json`;
        console.log("文件名", fileName);
        
        // 创建一个临时的下载链接
        const a = document.createElement('a');
        const url = URL.createObjectURL(dataBlob);
        
        // 设置下载属性
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        // 将元素添加到文档中
        document.body.appendChild(a);
        
        // 创建一个点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        
        // 触发点击事件
        a.dispatchEvent(clickEvent);
        
        // 清理
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
        }, 100);
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.words = JSON.parse(e.target.result);
                this.nextWord();
                this.updateStats();
            } catch (error) {
                console.error('导入数据失败:', error);
                alert('导入数据失败，请确保文件格式正确');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // 重置文件输入
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new WordMemoryApp();
    app.loadWords();
}); 