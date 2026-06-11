// ============================================
// AUTH.JS - Autenticação Firebase
// ============================================
// Responsabilidades:
// - login(email, senha)
// - register(email, senha, nome)
// - logout()
// - getCurrentUser()
// - checkAuth()
// - redirectByRole()
// ============================================

class Auth {
  constructor() {
    this.currentUser = null;
    this.checkAuth();
  }

  // Verificar se usuário está autenticado
  async checkAuth() {
    return new Promise((resolve) => {
      firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
          this.currentUser = user;
          // Buscar dados do usuário no Firestore
          const userData = await this.getUserData(user.uid);
          this.currentUser.role = userData?.role || 'candidato';
          resolve(user);
        } else {
          this.currentUser = null;
          resolve(null);
        }
      });
    });
  }

  // Login com email e senha
  async login(email, senha) {
    try {
      const result = await firebase.auth().signInWithEmailAndPassword(email, senha);
      this.currentUser = result.user;
      
      // Buscar dados do usuário
      const userData = await this.getUserData(result.user.uid);
      this.currentUser.role = userData?.role || 'candidato';
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Registro com email e senha
  async register(email, senha, nome) {
    try {
      const result = await firebase.auth().createUserWithEmailAndPassword(email, senha);
      
      // Atualizar perfil
      await result.user.updateProfile({ displayName: nome });
      
      // Criar documento no Firestore
      await firebase.firestore().collection('users').doc(result.user.uid).set({
        uid: result.user.uid,
        email: email,
        nome: nome,
        role: 'candidato',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      this.currentUser = result.user;
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Login com Google
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      
      // Verificar se é primeiro login
      const userDoc = await firebase.firestore().collection('users').doc(result.user.uid).get();
      
      if (!userDoc.exists) {
        // Criar documento para novo usuário
        await firebase.firestore().collection('users').doc(result.user.uid).set({
          uid: result.user.uid,
          email: result.user.email,
          nome: result.user.displayName,
          role: 'candidato',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      this.currentUser = result.user;
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Logout
  async logout() {
    try {
      await firebase.auth().signOut();
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Obter dados do usuário no Firestore
  async getUserData(uid) {
    try {
      const doc = await firebase.firestore().collection('users').doc(uid).get();
      return doc.data() || null;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return null;
    }
  }

  // Obter usuário atual
  getCurrentUser() {
    return this.currentUser;
  }

  // Auth Guard - Proteger páginas
  static requireAuth(requiredRole = null) {
    const auth = window.auth || new Auth();
    
    if (!auth.currentUser) {
      window.location.href = '/login.html';
      return false;
    }
    
    if (requiredRole && auth.currentUser.role !== requiredRole) {
      window.location.href = '/403.html'; // Página de acesso negado
      return false;
    }
    
    return true;
  }

  // Redirecionar por role
  static redirectByRole(user) {
    const roleMap = {
      'admin': '/admin/dashboard.html',
      'instrutor': '/instrutor/dashboard.html',
      'candidato': '/candidato/dashboard.html'
    };
    
    const role = user.role || 'candidato';
    window.location.href = roleMap[role];
  }

  // Traduzir erros do Firebase
  getErrorMessage(code) {
    const errors = {
      'auth/email-already-in-use': 'Este email já está registrado',
      'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
      'auth/invalid-email': 'Email inválido',
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
    };
    
    return errors[code] || 'Erro ao autenticar. Tente novamente.';
  }
}

// Inicializar Auth globalmente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
  });
} else {
  window.auth = new Auth();
}