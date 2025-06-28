/*
AI Recipe Curator - JavaScript Logic

SETUP INSTRUCTIONS:

1. OPENAI API KEY SETUP:
   - Get your API key from https://platform.openai.com/api-keys
   - Replace 'YOUR_OPENAI_API_KEY_HERE' below with your actual API key
   - Keep your API key secure and never share it publicly

2. DEPLOY TO GITHUB PAGES:
   - Create a new GitHub repository
   - Upload all 4 files (index.html, recipes.html, style.css, script.js)
   - Go to Settings > Pages
   - Select "Deploy from a branch" and choose "main"
   - Your app will be available at: https://yourusername.github.io/repository-name

3. RUN LOCALLY:
   - Save all files in the same folder
   - Open index.html in any modern web browser
   - No server required - works offline except for API calls

SECURITY NOTE: For production use, consider using a backend service to hide your API key.
*/

// ===== CONFIGURATION =====
const OPENAI_API_KEY = 'sk-Mfz_NI2jh3jjhQKotXHdP4C_im9AhtTJejuo5tAFApT3BlbkFJzGjgU4kZYypPeAgMTdFK_f4m2UnOAAWGn83jmbHlYA'; // Replace with your actual API key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ===== GLOBAL VARIABLES =====
let currentRecipe = null;
let currentAnalysis = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the recipes page
    if (window.location.pathname.includes('recipes.html') || 
        window.location.pathname.endsWith('/recipes.html')) {
        loadRecipes();
    }
    
    // Check API key on main page
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.endsWith('/') ||
        window.location.pathname.endsWith('/index.html')) {
        checkApiKey();
    }
});

// ===== API KEY VALIDATION =====
function checkApiKey() {
    if (OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
        showError('Please set up your OpenAI API key in script.js. See the instructions at the top of the file.');
    }
}

// ===== RECIPE ANALYSIS =====
async function analyzeRecipe() {
    const recipeText = document.getElementById('recipeInput').value.trim();
    
    if (!recipeText) {
        showError('Please enter a recipe to analyze.');
        return;
    }
    
    if (OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
        showError('Please set up your OpenAI API key first. See the instructions at the top of script.js');
        return;
    }
    
    // Show loading state
    showLoading();
    hideError();
    hideResults();
    
    try {
        const analysis = await callOpenAI(recipeText);
        currentRecipe = recipeText;
        currentAnalysis = analysis;
        displayResults(analysis);
    } catch (error) {
        console.error('Analysis error:', error);
        showError(`Analysis failed: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function callOpenAI(recipeText) {
    const prompt = `You are a professional chef and recipe reviewer. Analyze the following recipe and provide detailed feedback.

RECIPE TO ANALYZE:
${recipeText}

Please provide your analysis in the following JSON format:
{
  "score": [number from 1-10],
  "positive_aspects": ["list", "of", "positive", "points"],
  "issues": ["list", "of", "problems", "found"],
  "summary": "brief overall assessment"
}

EVALUATION CRITERIA:
- Logical ingredient proportions and ratios
- Realistic cooking times and temperatures
- Complete and clear step-by-step instructions
- Temperature and timing consistency throughout
- All ingredients mentioned in the instructions
- Practical feasibility and common cooking knowledge
- Proper food safety considerations
- Appropriate serving sizes and yields

Be specific and actionable in your feedback. Focus on what makes a recipe work well or what could cause problems for a home cook. Always translate your answer to Russian`;

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional chef and recipe reviewer. Provide detailed, actionable feedback in the exact JSON format requested.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 1000
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
        return JSON.parse(content);
    } catch (parseError) {
        throw new Error('Invalid response format from AI. Please try again.');
    }
}

function displayResults(analysis) {
    // Update score
    document.getElementById('recipeScore').textContent = analysis.score;
    
    // Update positive aspects
    const positiveList = document.getElementById('positiveList');
    positiveList.innerHTML = '';
    analysis.positive_aspects.forEach(aspect => {
        const li = document.createElement('li');
        li.textContent = aspect;
        positiveList.appendChild(li);
    });
    
    // Update issues
    const issuesList = document.getElementById('issuesList');
    issuesList.innerHTML = '';
    analysis.issues.forEach(issue => {
        const li = document.createElement('li');
        li.textContent = issue;
        issuesList.appendChild(li);
    });
    
    // Show/hide save button based on score
    const saveSection = document.getElementById('saveSection');
    if (analysis.score >= 7) {
        saveSection.classList.remove('hidden');
    } else {
        saveSection.classList.add('hidden');
    }
    
    // Show results
    document.getElementById('resultsSection').classList.remove('hidden');
}

// ===== RECIPE SAVING =====
function saveRecipe() {
    if (!currentRecipe || !currentAnalysis) {
        showError('No recipe to save. Please analyze a recipe first.');
        return;
    }
    
    const savedRecipes = getSavedRecipes();
    
    // Create recipe object
    const recipe = {
        id: Date.now().toString(),
        title: extractRecipeTitle(currentRecipe),
        content: currentRecipe,
        score: currentAnalysis.score,
        positive_aspects: currentAnalysis.positive_aspects,
        issues: currentAnalysis.issues,
        summary: currentAnalysis.summary,
        savedAt: new Date().toISOString()
    };
    
    savedRecipes.push(recipe);
    localStorage.setItem('aiRecipeCurator_recipes', JSON.stringify(savedRecipes));
    
    // Show success message
    alert('Recipe saved to favorites!');
    
    // Clear current recipe
    currentRecipe = null;
    currentAnalysis = null;
    document.getElementById('recipeInput').value = '';
    hideResults();
}

function extractRecipeTitle(recipeText) {
    // Try to extract title from first line or first few words
    const lines = recipeText.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
        const firstLine = lines[0].trim();
        // Remove common prefixes and limit length
        let title = firstLine.replace(/^(recipe|ingredients|directions?):?\s*/i, '');
        return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
    return 'Untitled Recipe';
}

function getSavedRecipes() {
    const saved = localStorage.getItem('aiRecipeCurator_recipes');
    return saved ? JSON.parse(saved) : [];
}

// ===== RECIPES PAGE FUNCTIONS =====
function loadRecipes() {
    const recipes = getSavedRecipes();
    const recipesList = document.getElementById('recipesList');
    const emptyState = document.getElementById('emptyState');
    
    if (recipes.length === 0) {
        recipesList.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    recipesList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    recipesList.innerHTML = '';
    
    recipes.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe);
        recipesList.appendChild(recipeCard);
    });
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    card.innerHTML = `
        <div class="recipe-header">
            <div class="recipe-title">${recipe.title}</div>
            <div class="recipe-score">${recipe.score}/10</div>
        </div>
        
        <div class="recipe-content">
            <h4>Recipe:</h4>
            <div class="recipe-text">${recipe.content}</div>
        </div>
        
        <div class="recipe-content">
            <h4>AI Analysis Summary:</h4>
            <p>${recipe.summary}</p>
        </div>
        
        <button class="delete-btn" onclick="deleteRecipe('${recipe.id}')">
            🗑️ Delete Recipe
        </button>
    `;
    
    return card;
}

function deleteRecipe(recipeId) {
    if (!confirm('Are you sure you want to delete this recipe?')) {
        return;
    }
    
    const savedRecipes = getSavedRecipes();
    const updatedRecipes = savedRecipes.filter(recipe => recipe.id !== recipeId);
    localStorage.setItem('aiRecipeCurator_recipes', JSON.stringify(updatedRecipes));
    
    loadRecipes(); // Reload the list
}

function clearAllRecipes() {
    if (!confirm('Are you sure you want to delete ALL saved recipes? This cannot be undone.')) {
        return;
    }
    
    localStorage.removeItem('aiRecipeCurator_recipes');
    loadRecipes(); // Reload the list
}

// ===== UI HELPER FUNCTIONS =====
function showLoading() {
    document.getElementById('loadingSection').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingSection').classList.add('hidden');
}

function showResults() {
    document.getElementById('resultsSection').classList.remove('hidden');
}

function hideResults() {
    document.getElementById('resultsSection').classList.add('hidden');
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorSection').classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorSection').classList.add('hidden');
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
} 