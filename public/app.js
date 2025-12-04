let isAuthenticated = false;

async function authFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'include'
    });
    
    if (response.status === 401) {
        isAuthenticated = false;
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('accessModal').classList.remove('hidden');
        try {
            const errorData = await response.clone().json();
            showToast(errorData.message || 'Session expired. Please log in again.', false);
        } catch (e) {
            showToast('Session expired. Please log in again.', false);
        }
        throw new Error('Authentication required');
    }
    
    if (response.status === 403) {
        try {
            const errorData = await response.clone().json();
            showToast(errorData.message || 'Access denied.', false);
        } catch (e) {
            showToast('Access denied.', false);
        }
        throw new Error('Access denied');
    }
    
    return response;
}

async function checkServerSession() {
    try {
        const response = await fetch('/api/check-session', {
            credentials: 'include'
        });
        const result = await response.json();
        return result.authenticated === true;
    } catch (error) {
        console.error('Session check error:', error);
        return false;
    }
}

async function checkAndAutoLogin() {
    const authenticated = await checkServerSession();
    if (authenticated) {
        isAuthenticated = true;
        document.getElementById('accessModal').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('initialRecordingDate').value = getTodayDate();
        document.getElementById('discussionDate').value = getTodayDate();
        return true;
    }
    return false;
}

function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function toggleLinkField() {
    const twitterOutreach = document.getElementById('twitterOutreach').value;
    const linkFieldContainer = document.getElementById('linkFieldContainer');
    
    if (twitterOutreach === 'Link') {
        linkFieldContainer.classList.remove('hidden');
        document.getElementById('twitterOutreachLink').required = true;
    } else {
        linkFieldContainer.classList.add('hidden');
        document.getElementById('twitterOutreachLink').required = false;
        document.getElementById('twitterOutreachLink').value = '';
    }
}

async function validateAccessCode(code) {
    const accessError = document.getElementById('accessError');
    const submitBtn = document.getElementById('accessSubmitBtn');
    const originalText = 'Unlock Access';
    let isLocked = false;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="flex items-center justify-center"><div class="loading"></div><span class="ml-2">Validating...</span></div>';
    accessError.classList.add('hidden');
    
    try {
        const response = await fetch('/api/validate-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isAuthenticated = true;
            document.getElementById('accessModal').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('initialRecordingDate').value = getTodayDate();
            document.getElementById('discussionDate').value = getTodayDate();
        } else {
            accessError.textContent = result.message;
            accessError.classList.remove('hidden');
            
            if (result.locked) {
                isLocked = true;
                let remaining = result.remainingSeconds || 60;
                submitBtn.textContent = `Locked (${remaining}s)`;
                const countdown = setInterval(() => {
                    remaining--;
                    submitBtn.textContent = `Locked (${remaining}s)`;
                    if (remaining <= 0) {
                        clearInterval(countdown);
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }, 1000);
            }
        }
    } catch (error) {
        console.error('Validation error:', error);
        accessError.textContent = 'Connection error. Please try again.';
        accessError.classList.remove('hidden');
    } finally {
        if (!isLocked) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await checkAndAutoLogin();
    
    document.getElementById('accessForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const code = document.getElementById('accessCode').value;
        if (code) {
            validateAccessCode(code);
        }
    });
    
    document.getElementById('accessCode').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = this.value;
            if (code) {
                validateAccessCode(code);
            }
        }
    });
});

function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `fixed top-4 right-4 toast ${isSuccess ? 'toast-success' : 'toast-error'}`;
    
    setTimeout(() => {
        toast.className = 'fixed top-4 right-4 hidden';
    }, 3000);
}

async function searchRecords() {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query) {
        showToast('Please enter a search term', false);
        return;
    }

    resultsDiv.innerHTML = '<div class="flex items-center justify-center py-4"><div class="loading"></div><span class="ml-2 text-gray-600">Searching...</span></div>';

    try {
        const response = await authFetch(`/api/search?query=${encodeURIComponent(query)}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            displayResults(result.data, result.message);
        } else {
            resultsDiv.innerHTML = `<p class="text-gray-500 text-center py-4">No matching records found</p>`;
            showToast('No matching records found', false);
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${error.message}</p>`;
        showToast('Search failed: ' + error.message, false);
    }
}

async function findInactiveProjects(days) {
    const resultsDiv = document.getElementById('searchResults');
    
    resultsDiv.innerHTML = `<div class="flex items-center justify-center py-4"><div class="loading"></div><span class="ml-2 text-gray-600">Generating CSV for ${days}+ days inactive projects...</span></div>`;

    try {
        const response = await authFetch(`/api/inactive?days=${days}&format=csv`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inactive-projects-${days}days.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            resultsDiv.innerHTML = `<p class="text-green-600 text-center py-4">✓ CSV file downloaded successfully!</p>`;
            showToast(`CSV generated successfully — check your downloads folder`, true);
        } else {
            const result = await response.json();
            resultsDiv.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${result.message}</p>`;
            showToast(result.message, false);
        }
    } catch (error) {
        console.error('Inactive projects error:', error);
        resultsDiv.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${error.message}</p>`;
        showToast('Failed to generate CSV: ' + error.message, false);
    }
}

async function downloadFollowUp(days = 12) {
    const resultsDiv = document.getElementById('searchResults');
    
    resultsDiv.innerHTML = `<div class="flex items-center justify-center py-4"><div class="loading"></div><span class="ml-2 text-gray-600">Generating follow-up CSV (${days} days, ASH/Yvonne)...</span></div>`;

    try {
        const csvResponse = await authFetch(`/api/followup?format=csv&days=${days}`);
        
        if (csvResponse.ok) {
            const blob = await csvResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `followup-${days}days.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast(`Follow-up CSV generated (${days} days) — check your downloads folder`, true);
            
            const dataResponse = await authFetch(`/api/followup?format=json&days=${days}`);
            const result = await dataResponse.json();
            
            if (result.success && result.data && result.data.length > 0) {
                displayResults(result.data, result.message);
            } else {
                resultsDiv.innerHTML = `<p class="text-green-600 text-center py-4">✓ CSV downloaded! No records found matching the criteria (${days} days, ASH/Yvonne)</p>`;
            }
        } else {
            const result = await csvResponse.json();
            resultsDiv.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${result.message}</p>`;
            showToast(result.message || 'Failed to generate follow-up CSV', false);
        }
    } catch (error) {
        console.error('Follow-up error:', error);
        resultsDiv.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${error.message}</p>`;
        showToast('Failed to generate follow-up CSV: ' + error.message, false);
    }
}

function displayResults(data, message, highlightInactive = false) {
    const resultsDiv = document.getElementById('searchResults');
    const headers = Object.keys(data[0]);
    let tableHTML = '<div class="overflow-x-auto"><table class="results-table"><thead><tr>';
    
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    data.forEach(row => {
        const daysInactive = row['Days Inactive'] || 0;
        let rowClass = '';
        if (highlightInactive) {
            if (daysInactive >= 100) {
                rowClass = 'class="bg-red-100"';
            } else if (daysInactive >= 70) {
                rowClass = 'class="bg-orange-100"';
            } else if (daysInactive >= 50) {
                rowClass = 'class="bg-yellow-100"';
            }
        }
        tableHTML += `<tr ${rowClass}>`;
        headers.forEach(header => {
            tableHTML += `<td>${row[header] || ''}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table></div>';
    resultsDiv.innerHTML = tableHTML;
    showToast(message);
}

document.getElementById('searchQuery').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchRecords();
    }
});

document.getElementById('addRecordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const twitterOutreachValue = document.getElementById('twitterOutreach').value;
    const twitterOutreachLink = document.getElementById('twitterOutreachLink').value.trim();
    
    let finalTwitterOutreach = twitterOutreachValue;
    if (twitterOutreachValue === 'Link' && twitterOutreachLink) {
        finalTwitterOutreach = twitterOutreachLink;
    }
    
    const formData = {
        ticker: document.getElementById('ticker').value.trim(),
        projectName: document.getElementById('projectName').value.trim(),
        xHandle: document.getElementById('xHandle').value.trim(),
        twitterOutreach: finalTwitterOutreach,
        lockStatus: document.getElementById('lockStatus').value.trim(),
        contactPerson: document.getElementById('contactPerson').value.trim(),
        initialRecordingDate: document.getElementById('initialRecordingDate').value,
        discussionDate: document.getElementById('discussionDate').value
    };

    if (!formData.ticker || !formData.projectName) {
        showToast('Ticker and Project Name are required', false);
        return;
    }

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<div class="flex items-center justify-center"><div class="loading"></div><span class="ml-2">Adding...</span></div>';

    try {
        const response = await authFetch('/api/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showToast(result.message);
            document.getElementById('addRecordForm').reset();
            document.getElementById('initialRecordingDate').value = getTodayDate();
            document.getElementById('discussionDate').value = getTodayDate();
            document.getElementById('linkFieldContainer').classList.add('hidden');
            document.getElementById('twitterOutreachLink').required = false;
        } else {
            showToast(result.message, false);
        }
    } catch (error) {
        console.error('Add error:', error);
        showToast('Failed to add record: ' + error.message, false);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});
