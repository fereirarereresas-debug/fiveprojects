<?php
/**
 * Five Projects - Dashboard Completo COM PAINEL ADMIN
 * Data: 2025-11-20 22:24:27 UTC
 * Usuário: fereirarereresas-debug
 * Sistema Admin Completo + Dashboard User
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'includes/config.php';

// Verificar login
if (!isLoggedIn()) {
    redirect('auth.php');
    exit;
}

$currentUser = getCurrentUser();

if (!$currentUser) {
    session_destroy();
    redirect('auth.php');
    exit;
}

// Verificar se é admin
$isAdmin = ($currentUser['role'] === 'admin' || $currentUser['role'] === 'moderator');

// ====================================
// PROCESSAR AÇÕES ADMIN
// ====================================

// Banir/Desbanir Usuário
if ($isAdmin && isPost() && isset($_POST['toggle_ban'])) {
    try {
        if (!verifyCSRFToken($_POST['csrf_token'])) {
            throw new Exception('Token CSRF inválido');
        }
        
        $targetUserId = (int)$_POST['user_id'];
        $banReason = sanitize($_POST['ban_reason'] ?? '');
        
        if ($targetUserId === $_SESSION['user_id']) {
            throw new Exception('Você não pode banir a si mesmo!');
        }
        
        $db = Database::getInstance();
        $targetUser = $db->fetchOne("SELECT * FROM users WHERE id = ?", [$targetUserId]);
        
        if (!$targetUser) {
            throw new Exception('Usuário não encontrado');
        }
        
        if ($targetUser['role'] === 'admin') {
            throw new Exception('Não é possível banir outro administrador');
        }
        
        $newBanStatus = $targetUser['banned'] ? 0 : 1;
        
        $db->query(
            "UPDATE users SET banned = ?, ban_reason = ? WHERE id = ?",
            [$newBanStatus, $banReason, $targetUserId]
        );
        
        $action = $newBanStatus ? 'banido' : 'desbanido';
        setFlash('success', "✅ Usuário {$targetUser['username']} foi {$action} com sucesso!");
        
        WebhookLogger::sendLog('admin_ban', [
            'admin' => $currentUser['username'],
            'target' => $targetUser['username'],
            'action' => $action,
            'reason' => $banReason
        ]);
        
        redirect('dashboard.php?tab=admin-users');
        
    } catch (Exception $e) {
        setFlash('error', $e->getMessage());
    }
}

// Alterar Role
if ($isAdmin && isPost() && isset($_POST['change_role'])) {
    try {
        if (!verifyCSRFToken($_POST['csrf_token'])) {
            throw new Exception('Token CSRF inválido');
        }
        
        $targetUserId = (int)$_POST['user_id'];
        $newRole = sanitize($_POST['new_role']);
        
        if (!in_array($newRole, ['user', 'moderator', 'admin'])) {
            throw new Exception('Role inválido');
        }
        
        if ($targetUserId === $_SESSION['user_id']) {
            throw new Exception('Você não pode alterar seu próprio role!');
        }
        
        $db = Database::getInstance();
        $db->query(
            "UPDATE users SET role = ? WHERE id = ?",
            [$newRole, $targetUserId]
        );
        
        setFlash('success', '✅ Role alterado com sucesso!');
        redirect('dashboard.php?tab=admin-users');
        
    } catch (Exception $e) {
        setFlash('error', $e->getMessage());
    }
}

// Deletar Usuário
if ($isAdmin && isPost() && isset($_POST['delete_user'])) {
    try {
        if (!verifyCSRFToken($_POST['csrf_token'])) {
            throw new Exception('Token CSRF inválido');
        }
        
        $targetUserId = (int)$_POST['user_id'];
        
        if ($targetUserId === $_SESSION['user_id']) {
            throw new Exception('Você não pode deletar a si mesmo!');
        }
        
        $db = Database::getInstance();
        $targetUser = $db->fetchOne("SELECT * FROM users WHERE id = ?", [$targetUserId]);
        
        if ($targetUser['role'] === 'admin') {
            throw new Exception('Não é possível deletar outro administrador');
        }
        
        $db->query("DELETE FROM users WHERE id = ?", [$targetUserId]);
        
        setFlash('success', '✅ Usuário deletado com sucesso!');
        
        WebhookLogger::sendLog('admin_delete', [
            'admin' => $currentUser['username'],
            'deleted_user' => $targetUser['username']
        ]);
        
        redirect('dashboard.php?tab=admin-users');
        
    } catch (Exception $e) {
        setFlash('error', $e->getMessage());
    }
}

// Limpar Logs
if ($isAdmin && isPost() && isset($_POST['clear_logs'])) {
    try {
        if (!verifyCSRFToken($_POST['csrf_token'])) {
            throw new Exception('Token CSRF inválido');
        }
        
        $logType = $_POST['log_type'] ?? 'all';
        $db = Database::getInstance();
        
        if ($logType === 'webhook') {
            $db->query("DELETE FROM webhook_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
            setFlash('success', '✅ Logs de webhook antigos removidos!');
        } elseif ($logType === 'activity') {
            $db->query("DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
            setFlash('success', '✅ Logs de atividade antigos removidos!');
        } elseif ($logType === 'login') {
            $db->query("DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
            setFlash('success', '✅ Tentativas de login antigas removidas!');
        } else {
            $db->query("DELETE FROM webhook_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
            $db->query("DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
            $db->query("DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
            setFlash('success', '✅ Todos os logs antigos foram limpos!');
        }
        
        redirect('dashboard.php?tab=admin-logs');
        
    } catch (Exception $e) {
        setFlash('error', $e->getMessage());
    }
}

// ====================================
// PROCESSAR AÇÕES USUÁRIO
// ====================================

// Resgatar Licença
if (isPost() && isset($_POST['redeem_license'])) {
    try {
        if (!verifyCSRFToken($_POST['csrf_token'])) {
            throw new Exception('Token CSRF inválido');
        }
        
        $licenseKey = sanitize($_POST['license_key']);
        
        if (empty($licenseKey)) {
            throw new Exception('Digite uma chave de licença');
        }
        
        $licenseObj = new License();
        $licenseId = $licenseObj->activate($_SESSION['user_id'], $licenseKey);
        
        setFlash('success', '🎉 Licença ativada com sucesso! ID: #' . $licenseId);
        redirect('dashboard.php?tab=licenses');
        
    } catch (Exception $e) {
        setFlash('error', $e->getMessage());
    }
}

// Atualizar Perfil
if (isPost() && isset($_POST['update_profile'])) {
    try {
        if (!verifyCSRFToken($_POST['csrf_token'])) {
            throw new Exception('Token CSRF inválido');
        }
        
        $email = sanitize($_POST['email']);
        $newPassword = $_POST['new_password'] ?? '';
        
        if (!isValidEmail($email)) {
            throw new Exception('Email inválido');
        }
        
        $db = Database::getInstance();
        
        if (!empty($newPassword)) {
            if (strlen($newPassword) < 8) {
                throw new Exception('A senha deve ter no mínimo 8 caracteres');
            }
            
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            
            $db->query(
                "UPDATE users SET email = ?, password = ? WHERE id = ?",
                [$email, $hashedPassword, $_SESSION['user_id']]
            );
            
            setFlash('success', '✅ Perfil e senha atualizados com sucesso!');
        } else {
            $db->query(
                "UPDATE users SET email = ? WHERE id = ?",
                [$email, $_SESSION['user_id']]
            );
            
            setFlash('success', '✅ Perfil atualizado com sucesso!');
        }
        
        redirect('dashboard.php?tab=profile');
        
    } catch (Exception $e) {
        setFlash('error', $e->getMessage());
    }
}

// ====================================
// BUSCAR DADOS
// ====================================

$licenses = [];
$tickets = [];
$activeLicensesCount = 0;
$openTicketsCount = 0;
$recentActivity = [];
$accountAge = 0;

// Dados Admin
$allUsers = [];
$systemStats = [];
$webhookLogs = [];
$activityLogs = [];
$recentTickets = [];

try {
    $db = Database::getInstance();
    $userObj = new User();
    $licenseObj = new License();
    $ticketObj = new Ticket();
    
    // Dados do usuário
    $profileData = $userObj->getProfile($_SESSION['user_id']);
    $licenses = $licenseObj->getUserLicenses($_SESSION['user_id']);
    $tickets = $ticketObj->getUserTickets($_SESSION['user_id']);
    $activeLicensesCount = $licenseObj->getActiveLicensesCount($_SESSION['user_id']);
    $openTicketsCount = $ticketObj->getOpenTicketsCount($_SESSION['user_id']);
    
    $recentActivity = $db->fetchAll(
        "SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        [$_SESSION['user_id']]
    );
    
    $created = strtotime($currentUser['created_at']);
    $now = time();
    $accountAge = floor(($now - $created) / 86400);
    
    // Dados Admin
    if ($isAdmin) {
        // Todos os usuários
        $allUsers = $db->fetchAll(
            "SELECT id, username, email, role, status, banned, ban_reason, created_at, last_login, last_ip 
             FROM users 
             ORDER BY created_at DESC"
        );
        
        // Estatísticas do sistema
        $systemStats = [
            'total_users' => $db->fetchOne("SELECT COUNT(*) as count FROM users")['count'],
            'active_users' => $db->fetchOne("SELECT COUNT(*) as count FROM users WHERE status = 'active'")['count'],
            'banned_users' => $db->fetchOne("SELECT COUNT(*) as count FROM users WHERE banned = 1")['count'],
            'total_licenses' => $db->fetchOne("SELECT COUNT(*) as count FROM user_licenses")['count'],
            'active_licenses' => $db->fetchOne("SELECT COUNT(*) as count FROM user_licenses WHERE status = 'active'")['count'],
            'total_tickets' => $db->fetchOne("SELECT COUNT(*) as count FROM tickets")['count'],
            'open_tickets' => $db->fetchOne("SELECT COUNT(*) as count FROM tickets WHERE status != 'closed'")['count'],
            'total_products' => $db->fetchOne("SELECT COUNT(*) as count FROM products")['count']
        ];
        
        // Webhook logs
        $webhookLogs = $db->fetchAll(
            "SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 50"
        );
        
        // Activity logs
        $activityLogs = $db->fetchAll(
            "SELECT al.*, u.username 
             FROM activity_logs al 
             LEFT JOIN users u ON al.user_id = u.id 
             ORDER BY al.created_at DESC 
             LIMIT 100"
        );
        
        // Tickets recentes
        $recentTickets = $db->fetchAll(
            "SELECT t.*, u.username 
             FROM tickets t 
             LEFT JOIN users u ON t.user_id = u.id 
             ORDER BY t.created_at DESC 
             LIMIT 20"
        );
    }
    
} catch (Exception $e) {
    error_log("Dashboard Error: " . $e->getMessage());
    setFlash('warning', 'Algumas informações podem não estar disponíveis no momento.');
}

// Pegar aba ativa
$activeTab = $_GET['tab'] ?? 'overview';

include 'includes/header.php';
include 'includes/dashboard-styles.php';
?>

<div class="dashboard-wrapper">
    <!-- ====================================
         SIDEBAR
         ==================================== -->
    <aside class="dashboard-sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="user-info">
                <div class="user-avatar">
                    <?php echo strtoupper(substr($currentUser['username'], 0, 2)); ?>
                </div>
                <div class="user-details">
                    <h3><?php echo e($currentUser['username']); ?></h3>
                    <p><span class="role-badge role-<?php echo $currentUser['role']; ?>"><?php echo ucfirst($currentUser['role']); ?></span></p>
                </div>
            </div>
        </div>

        <nav class="sidebar-menu">
            <!-- Menu Principal -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">Menu Principal</div>
                <button class="sidebar-item <?php echo $activeTab === 'overview' ? 'active' : ''; ?>" onclick="showTab('overview')">
                    <i class="fas fa-th-large"></i>
                    <span>Visão Geral</span>
                </button>
                <button class="sidebar-item <?php echo $activeTab === 'redeem' ? 'active' : ''; ?>" onclick="showTab('redeem')">
                    <i class="fas fa-gift"></i>
                    <span>Resgatar Licença</span>
                </button>
                <button class="sidebar-item <?php echo $activeTab === 'licenses' ? 'active' : ''; ?>" onclick="showTab('licenses')">
                    <i class="fas fa-key"></i>
                    <span>Minhas Licenças</span>
                    <?php if ($activeLicensesCount > 0): ?>
                        <span class="badge-count"><?php echo $activeLicensesCount; ?></span>
                    <?php endif; ?>
                </button>
                <button class="sidebar-item <?php echo $activeTab === 'tickets' ? 'active' : ''; ?>" onclick="showTab('tickets')">
                    <i class="fas fa-ticket-alt"></i>
                    <span>Suporte</span>
                    <?php if ($openTicketsCount > 0): ?>
                        <span class="badge-count"><?php echo $openTicketsCount; ?></span>
                    <?php endif; ?>
                </button>
                <button class="sidebar-item <?php echo $activeTab === 'activity' ? 'active' : ''; ?>" onclick="showTab('activity')">
                    <i class="fas fa-history"></i>
                    <span>Atividades</span>
                </button>
            </div>

            <!-- Painel Admin (Apenas para Admin) -->
            <?php if ($isAdmin): ?>
            <div class="sidebar-section">
                <div class="sidebar-section-title">👑 Painel Admin</div>
                <button class="sidebar-item admin-item <?php echo $activeTab === 'admin-overview' ? 'active' : ''; ?>" onclick="showTab('admin-overview')">
                    <i class="fas fa-crown"></i>
                    <span>Dashboard Admin</span>
                </button>
                <button class="sidebar-item admin-item <?php echo $activeTab === 'admin-users' ? 'active' : ''; ?>" onclick="showTab('admin-users')">
                    <i class="fas fa-users"></i>
                    <span>Gerenciar Usuários</span>
                    <span class="badge-count"><?php echo $systemStats['total_users'] ?? 0; ?></span>
                </button>
                <button class="sidebar-item admin-item <?php echo $activeTab === 'admin-logs' ? 'active' : ''; ?>" onclick="showTab('admin-logs')">
                    <i class="fas fa-file-alt"></i>
                    <span>Logs do Sistema</span>
                </button>
                <button class="sidebar-item admin-item <?php echo $activeTab === 'admin-tickets' ? 'active' : ''; ?>" onclick="showTab('admin-tickets')">
                    <i class="fas fa-headset"></i>
                    <span>Todos os Tickets</span>
                    <span class="badge-count"><?php echo $systemStats['open_tickets'] ?? 0; ?></span>
                </button>
            </div>
            <?php endif; ?>

            <!-- Configurações -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">Configurações</div>
                <button class="sidebar-item <?php echo $activeTab === 'profile' ? 'active' : ''; ?>" onclick="showTab('profile')">
                    <i class="fas fa-user-cog"></i>
                    <span>Meu Perfil</span>
                </button>
                <a href="logout.php" class="sidebar-item logout">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </a>
            </div>
        </nav>
    </aside>

    <!-- ====================================
         MAIN CONTENT
         ==================================== -->
    <main class="dashboard-content">
        
        <!-- TAB: Visão Geral (código anterior mantido) -->
        <div id="tab-overview" class="tab-content <?php echo $activeTab === 'overview' ? 'active' : ''; ?>">
            <!-- Conteúdo anterior mantido -->
            <div class="content-header">
                <h1>👋 Bem-vindo de volta, <span class="gradient-text"><?php echo e($currentUser['username']); ?></span>!</h1>
                <p>Aqui está um resumo completo da sua conta • <?php echo date('d/m/Y H:i'); ?></p>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-icon blue">
                        <i class="fas fa-key"></i>
                    </div>
                    <div class="stat-info">
                        <h3><?php echo $activeLicensesCount; ?></h3>
                        <p>Licenças Ativas</p>
                    </div>
                </div>

                <div class="stat-box">
                    <div class="stat-icon green">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Online</h3>
                        <p>Status do Sistema</p>
                    </div>
                </div>

                <div class="stat-box">
                    <div class="stat-icon orange">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <div class="stat-info">
                        <h3><?php echo $openTicketsCount; ?></h3>
                        <p>Tickets Abertos</p>
                    </div>
                </div>

                <div class="stat-box">
                    <div class="stat-icon purple">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="stat-info">
                        <h3><?php echo $accountAge; ?> dias</h3>
                        <p>Conta Criada</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Continua na parte 2 com abas ADMIN... -->
        <!-- ====================================
             TAB ADMIN 1: DASHBOARD ADMIN
             ==================================== -->
        <?php if ($isAdmin): ?>
        <div id="tab-admin-overview" class="tab-content <?php echo $activeTab === 'admin-overview' ? 'active' : ''; ?>">
            <div class="content-header">
                <h1>👑 <span class="gradient-text">Painel Administrativo</span></h1>
                <p>Visão geral completa do sistema • <?php echo date('d/m/Y H:i'); ?> UTC</p>
            </div>

            <!-- Admin Stats Grid -->
            <div class="admin-stats-grid">
                <div class="admin-stat-card blue">
                    <div class="admin-stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3><?php echo $systemStats['total_users']; ?></h3>
                        <p>Total de Usuários</p>
                        <span class="stat-detail">
                            <i class="fas fa-check"></i> <?php echo $systemStats['active_users']; ?> Ativos
                        </span>
                    </div>
                </div>

                <div class="admin-stat-card green">
                    <div class="admin-stat-icon">
                        <i class="fas fa-key"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3><?php echo $systemStats['total_licenses']; ?></h3>
                        <p>Total de Licenças</p>
                        <span class="stat-detail">
                            <i class="fas fa-check-circle"></i> <?php echo $systemStats['active_licenses']; ?> Ativas
                        </span>
                    </div>
                </div>

                <div class="admin-stat-card orange">
                    <div class="admin-stat-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3><?php echo $systemStats['total_tickets']; ?></h3>
                        <p>Total de Tickets</p>
                        <span class="stat-detail">
                            <i class="fas fa-clock"></i> <?php echo $systemStats['open_tickets']; ?> Abertos
                        </span>
                    </div>
                </div>

                <div class="admin-stat-card red">
                    <div class="admin-stat-icon">
                        <i class="fas fa-ban"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3><?php echo $systemStats['banned_users']; ?></h3>
                        <p>Usuários Banidos</p>
                        <span class="stat-detail">
                            <i class="fas fa-shield-alt"></i> Moderação Ativa
                        </span>
                    </div>
                </div>

                <div class="admin-stat-card purple">
                    <div class="admin-stat-icon">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3><?php echo $systemStats['total_products']; ?></h3>
                        <p>Produtos Disponíveis</p>
                        <span class="stat-detail">
                            <i class="fas fa-store"></i> Catálogo Ativo
                        </span>
                    </div>
                </div>

                <div class="admin-stat-card cyan">
                    <div class="admin-stat-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="admin-stat-info">
                        <h3><?php echo count($activityLogs); ?></h3>
                        <p>Atividades Recentes</p>
                        <span class="stat-detail">
                            <i class="fas fa-history"></i> Últimas 100
                        </span>
                    </div>
                </div>
            </div>

            <!-- Quick Actions Admin -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h2><i class="fas fa-bolt"></i> Ações Rápidas de Administrador</h2>
                </div>
                <div class="admin-quick-actions">
                    <button onclick="showTab('admin-users')" class="admin-action-btn blue">
                        <i class="fas fa-users"></i>
                        <span>Gerenciar Usuários</span>
                    </button>
                    <button onclick="showTab('admin-logs')" class="admin-action-btn green">
                        <i class="fas fa-file-alt"></i>
                        <span>Ver Logs</span>
                    </button>
                    <button onclick="showTab('admin-tickets')" class="admin-action-btn orange">
                        <i class="fas fa-headset"></i>
                        <span>Tickets</span>
                    </button>
                    <button onclick="testWebhook()" class="admin-action-btn purple">
                        <i class="fas fa-bell"></i>
                        <span>Testar Webhook</span>
                    </button>
                </div>
            </div>

            <!-- Últimas Atividades -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h2><i class="fas fa-history"></i> Atividades Recentes do Sistema</h2>
                    <button onclick="showTab('admin-logs')" class="btn btn-secondary btn-sm">
                        Ver Todas
                    </button>
                </div>
                <div class="admin-activity-list">
                    <?php foreach (array_slice($activityLogs, 0, 10) as $log): ?>
                        <div class="admin-activity-item">
                            <div class="activity-icon-admin">
                                <?php
                                $icons = [
                                    'login' => 'sign-in-alt',
                                    'logout' => 'sign-out-alt',
                                    'register' => 'user-plus',
                                    'license' => 'key',
                                    'ticket' => 'ticket-alt'
                                ];
                                $icon = $icons[strtolower($log['action'])] ?? 'circle';
                                ?>
                                <i class="fas fa-<?php echo $icon; ?>"></i>
                            </div>
                            <div class="activity-content-admin">
                                <div class="activity-header-admin">
                                    <strong><?php echo e($log['username'] ?? 'Sistema'); ?></strong>
                                    <span class="activity-action-text"><?php echo e($log['action']); ?></span>
                                </div>
                                <div class="activity-meta-admin">
                                    <span><i class="fas fa-clock"></i> <?php echo formatDate($log['created_at']); ?></span>
                                    <span><i class="fas fa-map-marker-alt"></i> <?php echo e($log['ip_address'] ?? 'N/A'); ?></span>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <!-- ====================================
             TAB ADMIN 2: GERENCIAR USUÁRIOS
             ==================================== -->
        <div id="tab-admin-users" class="tab-content <?php echo $activeTab === 'admin-users' ? 'active' : ''; ?>">
            <div class="content-header">
                <h1><i class="fas fa-users"></i> Gerenciar Usuários</h1>
                <p>Controle total sobre todos os usuários do sistema</p>
            </div>

            <div class="dashboard-card">
                <div class="card-header">
                    <h2>Lista de Usuários (<?php echo count($allUsers); ?>)</h2>
                    <div style="display: flex; gap: 1rem;">
                        <input type="text" id="searchUsers" placeholder="Buscar usuário..." 
                               style="padding: 0.5rem 1rem; background: var(--dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;">
                        <select id="filterRole" onchange="filterUsers()" 
                                style="padding: 0.5rem 1rem; background: var(--dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;">
                            <option value="all">Todos os Roles</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderador</option>
                            <option value="user">Usuário</option>
                        </select>
                    </div>
                </div>

                <div class="users-table-container">
                    <table class="admin-users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuário</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Criado em</th>
                                <th>Último Login</th>
                                <th>IP</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <?php foreach ($allUsers as $user): ?>
                                <tr class="user-row" data-role="<?php echo $user['role']; ?>">
                                    <td><strong>#<?php echo $user['id']; ?></strong></td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <div class="mini-avatar">
                                                <?php echo strtoupper(substr($user['username'], 0, 2)); ?>
                                            </div>
                                            <strong><?php echo e($user['username']); ?></strong>
                                        </div>
                                    </td>
                                    <td><?php echo e($user['email']); ?></td>
                                    <td>
                                        <span class="role-badge role-<?php echo $user['role']; ?>">
                                            <?php echo ucfirst($user['role']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php if ($user['banned']): ?>
                                            <span class="badge-status banned">
                                                <i class="fas fa-ban"></i> Banido
                                            </span>
                                        <?php else: ?>
                                            <span class="badge-status <?php echo $user['status']; ?>">
                                                <i class="fas fa-check"></i> <?php echo ucfirst($user['status']); ?>
                                            </span>
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo date('d/m/Y', strtotime($user['created_at'])); ?></td>
                                    <td><?php echo $user['last_login'] ? formatDate($user['last_login']) : 'Nunca'; ?></td>
                                    <td><code><?php echo e($user['last_ip'] ?? 'N/A'); ?></code></td>
                                    <td>
                                        <?php if ($user['id'] !== $_SESSION['user_id'] && $user['role'] !== 'admin'): ?>
                                            <div class="action-buttons">
                                                <button onclick="manageUser(<?php echo $user['id']; ?>, '<?php echo e($user['username']); ?>', '<?php echo $user['role']; ?>', <?php echo $user['banned']; ?>)" 
                                                        class="btn-icon" title="Gerenciar">
                                                    <i class="fas fa-cog"></i>
                                                </button>
                                            </div>
                                        <?php else: ?>
                                            <span style="color: var(--gray); font-size: 0.85rem;">
                                                <?php echo $user['id'] === $_SESSION['user_id'] ? 'Você' : 'Admin'; ?>
                                            </span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ====================================
             TAB ADMIN 3: LOGS DO SISTEMA
             ==================================== -->
        <div id="tab-admin-logs" class="tab-content <?php echo $activeTab === 'admin-logs' ? 'active' : ''; ?>">
            <div class="content-header">
                <h1><i class="fas fa-file-alt"></i> Logs do Sistema</h1>
                <p>Monitore todas as atividades e eventos do sistema</p>
            </div>

            <!-- Ações de Limpeza -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h2><i class="fas fa-broom"></i> Gerenciar Logs</h2>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <form method="POST" action="" style="display: inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                        <input type="hidden" name="log_type" value="webhook">
                        <button type="submit" name="clear_logs" class="btn btn-secondary btn-block" 
                                onclick="return confirm('Remover logs de webhook com mais de 30 dias?')">
                            <i class="fas fa-trash"></i> Limpar Webhook Logs
                        </button>
                    </form>

                    <form method="POST" action="" style="display: inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                        <input type="hidden" name="log_type" value="activity">
                        <button type="submit" name="clear_logs" class="btn btn-secondary btn-block" 
                                onclick="return confirm('Remover logs de atividade com mais de 30 dias?')">
                            <i class="fas fa-trash"></i> Limpar Activity Logs
                        </button>
                    </form>

                    <form method="POST" action="" style="display: inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                        <input type="hidden" name="log_type" value="login">
                        <button type="submit" name="clear_logs" class="btn btn-secondary btn-block" 
                                onclick="return confirm('Remover tentativas de login com mais de 7 dias?')">
                            <i class="fas fa-trash"></i> Limpar Login Attempts
                        </button>
                    </form>

                    <form method="POST" action="" style="display: inline;">
                        <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                        <input type="hidden" name="log_type" value="all">
                        <button type="submit" name="clear_logs" class="btn btn-danger btn-block" 
                                onclick="return confirm('⚠️ ATENÇÃO! Isso vai limpar TODOS os logs antigos. Confirmar?')">
                            <i class="fas fa-trash-alt"></i> Limpar Todos
                        </button>
                    </form>
                </div>
            </div>

            <!-- Webhook Logs -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h2><i class="fas fa-bell"></i> Webhook Logs (<?php echo count($webhookLogs); ?>)</h2>
                </div>
                <div class="logs-container">
                    <?php if (empty($webhookLogs)): ?>
                        <div class="empty-state">
                            <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
                            <h3>Nenhum Log de Webhook</h3>
                            <p>Os logs de webhook aparecerão aqui</p>
                        </div>
                    <?php else: ?>
                        <div class="logs-grid">
                            <?php foreach ($webhookLogs as $log): ?>
                                <div class="log-card">
                                    <div class="log-header">
                                        <span class="log-action">
                                            <?php
                                            $icons = [
                                                'register' => 'user-plus',
                                                'login' => 'sign-in-alt',
                                                'ticket' => 'ticket-alt',
                                                'license' => 'key'
                                            ];
                                            $icon = $icons[$log['action']] ?? 'circle';
                                            ?>
                                            <i class="fas fa-<?php echo $icon; ?>"></i>
                                            <?php echo ucfirst($log['action']); ?>
                                        </span>
                                        <span class="log-status <?php echo $log['sent'] ? 'sent' : 'pending'; ?>">
                                            <?php echo $log['sent'] ? 'Enviado' : 'Pendente'; ?>
                                        </span>
                                    </div>
                                    <div class="log-meta">
                                        <span><i class="fas fa-clock"></i> <?php echo formatDate($log['created_at']); ?></span>
                                        <span><i class="fas fa-map-marker-alt"></i> <?php echo e($log['ip_address']); ?></span>
                                    </div>
                                    <div class="log-data">
                                        <pre><?php echo json_encode(json_decode($log['data']), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); ?></pre>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

              <!-- Activity Logs -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h2><i class="fas fa-history"></i> Activity Logs (<?php echo count($activityLogs); ?>)</h2>
                </div>
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuário</th>
                                <th>Ação</th>
                                <th>Detalhes</th>
                                <th>IP</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($activityLogs as $log): ?>
                                <tr>
                                    <td>#<?php echo $log['id']; ?></td>
                                    <td><strong><?php echo e($log['username'] ?? 'N/A'); ?></strong></td>
                                    <td><code><?php echo e($log['action']); ?></code></td>
                                    <td><?php echo e($log['details'] ?? '-'); ?></td>
                                    <td><code><?php echo e($log['ip_address'] ?? 'N/A'); ?></code></td>
                                    <td><?php echo formatDate($log['created_at']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ====================================
             TAB ADMIN 4: TODOS OS TICKETS
             ==================================== -->
        <div id="tab-admin-tickets" class="tab-content <?php echo $activeTab === 'admin-tickets' ? 'active' : ''; ?>">
            <div class="content-header">
                <h1><i class="fas fa-headset"></i> Gerenciar Tickets</h1>
                <p>Visualize e responda todos os tickets de suporte</p>
            </div>

            <div class="dashboard-card">
                <div class="card-header">
                    <h2>Tickets Recentes (<?php echo count($recentTickets); ?>)</h2>
                    <select onchange="filterTickets(this.value)" 
                            style="padding: 0.5rem 1rem; background: var(--dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;">
                        <option value="all">Todos os Status</option>
                        <option value="open">Abertos</option>
                        <option value="answered">Respondidos</option>
                        <option value="pending">Pendentes</option>
                        <option value="closed">Fechados</option>
                    </select>
                </div>

                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuário</th>
                                <th>Email</th>
                                <th>Assunto</th>
                                <th>Categoria</th>
                                <th>Prioridade</th>
                                <th>Status</th>
                                <th>Data</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="ticketsTableBody">
                            <?php foreach ($recentTickets as $ticket): ?>
                                <tr class="ticket-row" data-status="<?php echo $ticket['status']; ?>">
                                    <td><strong>#<?php echo $ticket['id']; ?></strong></td>
                                    <td><?php echo e($ticket['username'] ?? 'Anônimo'); ?></td>
                                    <td><?php echo e($ticket['email']); ?></td>
                                    <td><?php echo e($ticket['subject']); ?></td>
                                    <td><code><?php echo e($ticket['category']); ?></code></td>
                                    <td>
                                        <span class="priority-badge <?php echo $ticket['priority'] ?? 'medium'; ?>">
                                            <?php echo ucfirst($ticket['priority'] ?? 'medium'); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge badge-<?php echo $ticket['status']; ?>">
                                            <?php echo ucfirst($ticket['status']); ?>
                                        </span>
                                    </td>
                                    <td><?php echo formatDate($ticket['created_at']); ?></td>
                                    <td>
                                        <button onclick="viewTicket(<?php echo $ticket['id']; ?>)" 
                                                class="btn-icon" title="Ver Detalhes">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <!-- Continua na Parte 3 com MODALS e JAVASCRIPT... -->
        <!-- Continua após as abas admin... -->

        <!-- ABAS DE USUÁRIO (mantidas do código anterior) -->
        <!-- TAB: Redeem, Licenses, Tickets, Activity, Profile -->
        <!-- (código anterior mantido - não vou repetir) -->

    </main>
</div>

<!-- ====================================
     MODALS ADMIN
     ==================================== -->

<!-- Modal: Gerenciar Usuário -->
<div id="manageUserModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2><i class="fas fa-user-cog"></i> Gerenciar Usuário</h2>
            <button class="modal-close" onclick="closeModal('manageUserModal')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <div id="userManageContent">
                <!-- Preenchido via JavaScript -->
            </div>
        </div>
    </div>
</div>

<!-- Modal: Ver Ticket -->
<div id="viewTicketModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2><i class="fas fa-ticket-alt"></i> Detalhes do Ticket</h2>
            <button class="modal-close" onclick="closeModal('viewTicketModal')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <div id="ticketContent">
                <!-- Preenchido via JavaScript -->
            </div>
        </div>
    </div>
</div>

<!-- ====================================
     ESTILOS ADMIN ADICIONAIS
     ==================================== -->
<style>
/* Admin Stats Grid */
.admin-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.admin-stat-card {
    background: var(--dark-lighter);
    padding: 2rem;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 1.5rem;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.admin-stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--primary);
}

.admin-stat-card.blue::before { background: var(--primary); }
.admin-stat-card.green::before { background: var(--success); }
.admin-stat-card.orange::before { background: var(--warning); }
.admin-stat-card.red::before { background: var(--danger); }
.admin-stat-card.purple::before { background: var(--accent); }
.admin-stat-card.cyan::before { background: #06b6d4; }

.admin-stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.admin-stat-icon {
    width: 70px;
    height: 70px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    background: rgba(0, 102, 255, 0.2);
    color: var(--primary);
}

.admin-stat-card.blue .admin-stat-icon { background: rgba(0, 102, 255, 0.2); color: var(--primary); }
.admin-stat-card.green .admin-stat-icon { background: rgba(16, 185, 129, 0.2); color: var(--success); }
.admin-stat-card.orange .admin-stat-icon { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
.admin-stat-card.red .admin-stat-icon { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
.admin-stat-card.purple .admin-stat-icon { background: rgba(124, 58, 237, 0.2); color: var(--accent); }
.admin-stat-card.cyan .admin-stat-icon { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }

.admin-stat-info h3 {
    font-size: 2.2rem;
    margin-bottom: 0.5rem;
}

.admin-stat-info p {
    color: var(--gray);
    font-size: 1rem;
    margin-bottom: 0.5rem;
}

.stat-detail {
    display: block;
    font-size: 0.85rem;
    color: var(--success);
    margin-top: 0.5rem;
}

.stat-detail i {
    margin-right: 0.25rem;
}

/* Admin Quick Actions */
.admin-quick-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.admin-action-btn {
    padding: 1.5rem;
    background: var(--dark);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: var(--white);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
}

.admin-action-btn:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.admin-action-btn.blue:hover { border-color: var(--primary); }
.admin-action-btn.green:hover { border-color: var(--success); }
.admin-action-btn.orange:hover { border-color: var(--warning); }
.admin-action-btn.purple:hover { border-color: var(--accent); }

.admin-action-btn i {
    font-size: 2rem;
}

/* Admin Activity List */
.admin-activity-list {
    display: grid;
    gap: 1rem;
}

.admin-activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--dark);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: var(--transition);
}

.admin-activity-item:hover {
    border-color: var(--primary);
}

.activity-icon-admin {
    width: 45px;
    height: 45px;
    border-radius: 10px;
    background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.activity-content-admin {
    flex: 1;
}

.activity-header-admin {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.activity-action-text {
    padding: 0.25rem 0.75rem;
    background: rgba(0, 102, 255, 0.2);
    border-radius: 12px;
    font-size: 0.85rem;
    color: var(--primary);
}

.activity-meta-admin {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: var(--gray);
}

/* Users Table */
.users-table-container {
    overflow-x: auto;
}

.admin-users-table {
    width: 100%;
    border-collapse: collapse;
}

.admin-users-table th,
.admin-users-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-users-table th {
    color: var(--gray);
    font-weight: 600;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: var(--dark);
}

.admin-users-table tr:hover {
    background: rgba(0, 102, 255, 0.05);
}

.mini-avatar {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: bold;
}

.role-badge {
    padding: 0.4rem 0.8rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
}

.role-badge.role-admin {
    background: rgba(239, 68, 68, 0.2);
    color: var(--danger);
}

.role-badge.role-moderator {
    background: rgba(245, 158, 11, 0.2);
    color: var(--warning);
}

.role-badge.role-user {
    background: rgba(0, 102, 255, 0.2);
    color: var(--primary);
}

.badge-status {
    padding: 0.4rem 0.8rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.badge-status.active {
    background: rgba(16, 185, 129, 0.2);
    color: var(--success);
}

.badge-status.inactive {
    background: rgba(139, 146, 176, 0.2);
    color: var(--gray);
}

.badge-status.banned {
    background: rgba(239, 68, 68, 0.2);
    color: var(--danger);
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
}

.btn-icon {
    width: 35px;
    height: 35px;
    border-radius: 8px;
    background: var(--dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--white);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-icon:hover {
    background: var(--primary);
    border-color: var(--primary);
}

/* Logs */
.logs-container {
    max-height: 600px;
    overflow-y: auto;
}

.logs-grid {
    display: grid;
    gap: 1rem;
}

.log-card {
    background: var(--dark);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.log-action {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.log-status {
    padding: 0.3rem 0.8rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 700;
}

.log-status.sent {
    background: rgba(16, 185, 129, 0.2);
    color: var(--success);
}

.log-status.pending {
    background: rgba(245, 158, 11, 0.2);
    color: var(--warning);
}

.log-meta {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: var(--gray);
}

.log-data {
    background: var(--dark-light);
    padding: 1rem;
    border-radius: 8px;
    max-height: 200px;
    overflow-y: auto;
}

.log-data pre {
    margin: 0;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.priority-badge {
    padding: 0.3rem 0.8rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 700;
}

.priority-badge.low {
    background: rgba(139, 146, 176, 0.2);
    color: var(--gray);
}

.priority-badge.medium {
    background: rgba(245, 158, 11, 0.2);
    color: var(--warning);
}

.priority-badge.high {
    background: rgba(239, 68, 68, 0.2);
    color: var(--danger);
}

/* Modals */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}

.modal.active {
    display: flex;
}

.modal-content {
    background: var(--dark-lighter);
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h2 {
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.modal-close {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--white);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover {
    background: var(--danger);
    border-color: var(--danger);
}

.modal-body {
    padding: 2rem;
}

.user-manage-section {
    margin-bottom: 2rem;
}

.user-manage-section h3 {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--primary);
}

.manage-actions {
    display: grid;
    gap: 1rem;
}

.admin-item {
    border-left: 3px solid var(--warning);
}

/* Sidebar Admin Item Highlight */
.sidebar-item.admin-item:hover,
.sidebar-item.admin-item.active {
    background: rgba(245, 158, 11, 0.1);
}

.sidebar-item.admin-item::before {
    background: var(--warning);
}

/* Responsivo Admin */
@media (max-width: 1024px) {
    .admin-stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
}

@media (max-width: 768px) {
    .admin-stats-grid {
        grid-template-columns: 1fr;
    }

    .admin-quick-actions {
        grid-template-columns: 1fr;
    }
}
</style>

<!-- ====================================
     JAVASCRIPT ADMIN
     ==================================== -->
<script>
// Sistema de Abas
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.getAttribute('onclick') === `showTab('${tabName}')`) {
            item.classList.add('active');
        }
    });
    
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.pushState({}, '', url);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Gerenciar Usuário
function manageUser(userId, username, role, banned) {
    const modal = document.getElementById('manageUserModal');
    const content = document.getElementById('userManageContent');
    
    const banAction = banned ? 'desbanir' : 'banir';
    const banText = banned ? 'Desbanir Usuário' : 'Banir Usuário';
    const banIcon = banned ? 'unlock' : 'ban';
    
    content.innerHTML = `
        <div class="user-manage-section">
            <h3><i class="fas fa-user"></i> Usuário: ${username}</h3>
            <p style="color: var(--gray);">ID: #${userId} | Role Atual: <span class="role-badge role-${role}">${role}</span></p>
        </div>

        <div class="user-manage-section">
            <h3><i class="fas fa-shield-alt"></i> Alterar Role</h3>
            <form method="POST" action="">
                <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                <input type="hidden" name="user_id" value="${userId}">
                <div class="form-group">
                    <select name="new_role" required style="width: 100%; padding: 0.75rem; background: var(--dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;">
                        <option value="user" ${role === 'user' ? 'selected' : ''}>Usuário</option>
                        <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Moderador</option>
                        <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                </div>
                <button type="submit" name="change_role" class="btn btn-primary btn-block">
                    <i class="fas fa-check"></i> Alterar Role
                </button>
            </form>
        </div>

        <div class="user-manage-section">
            <h3><i class="fas fa-${banIcon}"></i> ${banText}</h3>
            <form method="POST" action="">
                <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                <input type="hidden" name="user_id" value="${userId}">
                ${!banned ? `
                <div class="form-group">
                    <label>Motivo do Banimento:</label>
                    <textarea name="ban_reason" rows="3" placeholder="Digite o motivo..." style="width: 100%; padding: 0.75rem; background: var(--dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;"></textarea>
                </div>
                ` : ''}
                <button type="submit" name="toggle_ban" class="btn ${banned ? 'btn-success' : 'btn-danger'} btn-block" onclick="return confirm('Tem certeza que deseja ${banAction} este usuário?')">
                    <i class="fas fa-${banIcon}"></i> ${banText}
                </button>
            </form>
        </div>

        <div class="user-manage-section">
            <h3><i class="fas fa-trash"></i> Deletar Usuário</h3>
            <form method="POST" action="">
                <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                <input type="hidden" name="user_id" value="${userId}">
                <button type="submit" name="delete_user" class="btn btn-danger btn-block" onclick="return confirm('⚠️ ATENÇÃO! Esta ação é IRREVERSÍVEL!\\n\\nTodos os dados do usuário serão PERMANENTEMENTE DELETADOS:\\n- Licenças\\n- Tickets\\n- Atividades\\n\\nConfirmar deleção de ${username}?')">
                    <i class="fas fa-trash-alt"></i> Deletar Usuário Permanentemente
                </button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
}

// Ver Ticket
function viewTicket(ticketId) {
    const modal = document.getElementById('viewTicketModal');
    const content = document.getElementById('ticketContent');
    
    content.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    modal.classList.add('active');
    
    // Aqui você pode fazer um fetch para buscar detalhes do ticket
    setTimeout(() => {
        content.innerHTML = `
            <div style="padding: 1rem;">
                <p style="color: var(--gray);">Detalhes do ticket #${ticketId}</p>
                <p>Funcionalidade em desenvolvimento...</p>
            </div>
        `;
    }, 500);
}

// Fechar Modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Fechar modal ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});

// Buscar Usuários
document.getElementById('searchUsers')?.addEventListener('input', function(e) {
    const search = e.target.value.toLowerCase();
    document.querySelectorAll('.user-row').forEach(row => {
        const username = row.cells[1].textContent.toLowerCase();
        const email = row.cells[2].textContent.toLowerCase();
        row.style.display = (username.includes(search) || email.includes(search)) ? '' : 'none';
    });
});

// Filtrar por Role
function filterUsers() {
    const role = document.getElementById('filterRole').value;
    document.querySelectorAll('.user-row').forEach(row => {
        if (role === 'all' || row.dataset.role === role) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filtrar Tickets
function filterTickets(status) {
    document.querySelectorAll('.ticket-row').forEach(row => {
        if (status === 'all' || row.dataset.status === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Testar Webhook
function testWebhook() {
    if (confirm('Enviar webhook de teste?')) {
        fetch('test-webhook-action.php?action=test')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('✅ Webhook enviado com sucesso! Verifique seu Discord.');
                } else {
                    alert('❌ Falha ao enviar webhook: ' + (data.message || 'Erro desconhecido'));
                }
            })
            .catch(error => {
                alert('❌ Erro ao enviar webhook');
                console.error(error);
            });
    }
}

// Reset HWID
function resetHWID(licenseId) {
    if (!confirm('⚠️ Tem certeza que deseja resetar o HWID?\n\nVocê só pode fazer isso uma vez a cada 30 dias.')) {
        return;
    }
    
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetando...';
    btn.disabled = true;
    
    fetch('ajax/reset-hwid.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_id: licenseId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ HWID resetado com sucesso!');
            location.reload();
        } else {
            alert('❌ ' + (data.message || 'Erro ao resetar HWID'));
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    })
    .catch(error => {
        alert('❌ Erro ao resetar HWID');
        console.error(error);
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// Formatar input de licença
const licenseInput = document.getElementById('license-key');
if (licenseInput) {
    licenseInput.addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });
}

// Console log
console.log('%c👑 Five Projects - Admin Dashboard', 'color: #f59e0b; font-size: 20px; font-weight: bold;');
console.log('%cSistema Admin Ultra Completo Carregado!', 'color: #00d4ff; font-size: 14px;');
console.log('%c2025-11-20 22:27:15 UTC | fereirarereresas-debug', 'color: #8b92b0; font-size: 12px;');
</script>

<?php include 'includes/footer.php'; ?>
