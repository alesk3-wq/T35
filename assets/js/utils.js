// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Formata CPF automaticamente: XXX.XXX.XXX-XX
 * @param {string} value - Valor digitado
 * @returns {string} - CPF formatado
 */
export function formatCPF(value) {
    // Remove tudo que não é número
    let cpf = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    cpf = cpf.slice(0, 11);
    
    // Aplica a máscara: XXX.XXX.XXX-XX
    if (cpf.length > 8) {
        cpf = cpf.slice(0, 3) + '.' + cpf.slice(3, 6) + '.' + cpf.slice(6, 9) + '-' + cpf.slice(9, 11);
    } else if (cpf.length > 5) {
        cpf = cpf.slice(0, 3) + '.' + cpf.slice(3, 6) + '.' + cpf.slice(6);
    } else if (cpf.length > 2) {
        cpf = cpf.slice(0, 3) + '.' + cpf.slice(3);
    }
    
    return cpf;
}

/**
 * Formata Telefone automaticamente: (XX) XXXXX-XXXX
 * @param {string} value - Valor digitado
 * @returns {string} - Telefone formatado
 */
export function formatPhone(value) {
    // Remove tudo que não é número
    let phone = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    phone = phone.slice(0, 11);
    
    // Aplica a máscara: (XX) XXXXX-XXXX
    if (phone.length > 7) {
        phone = '(' + phone.slice(0, 2) + ') ' + phone.slice(2, 7) + '-' + phone.slice(7, 11);
    } else if (phone.length > 2) {
        phone = '(' + phone.slice(0, 2) + ') ' + phone.slice(2);
    } else if (phone.length > 0) {
        phone = '(' + phone;
    }
    
    return phone;
}

/**
 * Remove formatação de CPF
 * @param {string} cpf - CPF formatado
 * @returns {string} - CPF apenas com números
 */
export function removeCPFFormat(cpf) {
    return cpf.replace(/\D/g, '');
}

/**
 * Remove formatação de Telefone
 * @param {string} phone - Telefone formatado
 * @returns {string} - Telefone apenas com números
 */
export function removePhoneFormat(phone) {
    return phone.replace(/\D/g, '');
}

/**
 * Valida CPF
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {boolean} - True se válido
 */
export function validateCPF(cpf) {
    const cleanCPF = removeCPFFormat(cpf);
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) return false;
    
    // Verifica se não é uma sequência repetida
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Calcula primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCPF[i]) * (10 - i);
    }
    let firstDigit = 11 - (sum % 11);
    firstDigit = firstDigit > 9 ? 0 : firstDigit;
    
    // Calcula segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCPF[i]) * (11 - i);
    }
    let secondDigit = 11 - (sum % 11);
    secondDigit = secondDigit > 9 ? 0 : secondDigit;
    
    // Compara com os dígitos do CPF
    return parseInt(cleanCPF[9]) === firstDigit && parseInt(cleanCPF[10]) === secondDigit;
}

/**
 * Gera código de presença sequencial
 * @returns {string} - Código 6 dígitos
 */
export function generatePresenceCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Formata data para pt-BR
 * @param {Date|string} date - Data a formatar
 * @returns {string} - Data formatada (DD/MM/YYYY)
 */
export function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formata hora para pt-BR
 * @param {Date|string} date - Data/hora a formatar
 * @returns {string} - Hora formatada (HH:MM)
 */
export function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Converte data pt-BR para ISO
 * @param {string} dateString - Data em formato DD/MM/YYYY
 * @returns {string} - Data em formato YYYY-MM-DD
 */
export function convertDateToISO(dateString) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
}

console.log('✅ Utils carregado com sucesso!');