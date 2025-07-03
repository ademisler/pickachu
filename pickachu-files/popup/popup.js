document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.grid button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const tool = button.id;
            chrome.runtime.sendMessage({ type: 'ACTIVATE_TOOL', tool });
            window.close(); 
        });
    });
});