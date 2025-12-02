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

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('initialRecordingDate').value = getTodayDate();
    document.getElementById('discussionDate').value = getTodayDate();
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
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
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
    
    resultsDiv.innerHTML = `<div class="flex items-center justify-center py-4"><div class="loading"></div><span class="ml-2 text-gray-600">Finding projects inactive for ${days}+ days...</span></div>`;

    try {
        const response = await fetch(`/api/inactive?days=${days}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            displayResults(result.data, result.message, true);
        } else if (result.success) {
            resultsDiv.innerHTML = `<p class="text-green-600 text-center py-4">No projects found inactive for ${days}+ days</p>`;
            showToast(`No projects inactive for ${days}+ days`, true);
        } else {
            resultsDiv.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${result.message}</p>`;
            showToast(result.message, false);
        }
    } catch (error) {
        console.error('Inactive projects error:', error);
        resultsDiv.innerHTML = `<p class="text-red-500 text-center py-4">Error: ${error.message}</p>`;
        showToast('Failed to find inactive projects: ' + error.message, false);
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
        const response = await fetch('/api/add', {
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
