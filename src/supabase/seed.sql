-- ============================================================
-- Cremona CRM - Seed de desenvolvimento
-- ============================================================

-- Limpar dados anteriores (ordem respeita FK)
delete from activities;
delete from sales;
delete from tasks;
delete from deals;
delete from messages;
delete from contacts;
delete from pipeline_stages;
delete from workspace_members;
delete from workspaces;

-- ============================================================
-- Workspace
-- ============================================================
insert into workspaces (id, name, slug, plan, trial_ends_at)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Loja da Maria',
  'loja-da-maria',
  'trial',
  now() + interval '30 days'
);

-- ============================================================
-- Pipeline stages
-- ============================================================
insert into pipeline_stages (id, workspace_id, name, color, position) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Novo lead',        '#378ADD', 1),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Contato feito',    '#22C55E', 2),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Proposta enviada', '#F59E0B', 3),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Negociacao',       '#8B5CF6', 4),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Fechado',          '#10B981', 5);

-- ============================================================
-- Contatos
-- ============================================================
insert into contacts (id, workspace_id, name, phone, email, company, position, tags, pipeline_stage_id) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Ana Paula Ferreira',   '5511991234501', 'ana.ferreira@gmail.com',    'Ferreira Moda',      'Proprietaria', array['quente','vip'],    'bbbbbbbb-0000-0000-0000-000000000003'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Carlos Eduardo Lima',  '5511982345602', 'carloslima@empresa.com.br', 'Lima Construcoes',   'Diretor',       array['quente'],          'bbbbbbbb-0000-0000-0000-000000000004'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Mariana Santos',       '5521973456703', 'mari.santos@outlook.com',   'Santos & Filhos',    'Gerente',       array['cliente'],         'bbbbbbbb-0000-0000-0000-000000000005'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Rafael Oliveira',      '5511964567804', 'rafael.oli@gmail.com',      'Oliveira Tech',      'CEO',           array['frio'],            'bbbbbbbb-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Juliana Costa',        '5531955678905', 'ju.costa@negocio.com',      'Costa Alimentos',    'Socia',         array['quente','cliente'],'bbbbbbbb-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Fernando Souza',       '5511946789006', 'fernandos@souza.ind.br',    'Souza Industria',    'Comprador',     array['vip','cliente'],   'bbbbbbbb-0000-0000-0000-000000000003'),
  ('cccccccc-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Beatriz Rodrigues',    '5511937890107', 'bia.rodrigues@hotmail.com', 'Rodrigues Varejo',   'Proprietaria',  array['frio'],            'bbbbbbbb-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Thiago Mendes',        '5511928901208', 'thiago.m@mendes.com.br',    'Mendes Servicos',    'Gerente',       array['quente'],          'bbbbbbbb-0000-0000-0000-000000000002');

-- ============================================================
-- Tasks
-- ============================================================
insert into tasks (workspace_id, contact_id, title, priority, due_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'Enviar proposta revisada', 'high',   now() + interval '2 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002',
   'Ligar para Carlos sobre contrato', 'high', now() + interval '1 day'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004',
   'Follow-up por WhatsApp', 'medium', now() + interval '5 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000006',
   'Agendar visita tecnica', 'medium', now() + interval '7 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000008',
   'Enviar catalogo atualizado', 'low',  now() + interval '10 days');

-- ============================================================
-- Sales
-- ============================================================
insert into sales (workspace_id, contact_id, product_name, value, payment_method, status, sale_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003',
   'Plano Mensal Premium', 1200.00, 'pix',           'paid',      current_date - interval '2 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000005',
   'Consultoria Inicial',  2500.00, 'transfer',      'paid',      current_date - interval '8 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000006',
   'Pacote Anual',         9800.00, 'boleto',        'pending',   current_date - interval '15 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', null,
   'Servico de Implantacao', 1800.00, 'cash',        'cancelled', current_date - interval '22 days');

-- ============================================================
-- Activities
-- ============================================================
insert into activities (workspace_id, contact_id, type, content) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'whatsapp',     'Cliente perguntou sobre prazo de entrega. Respondido em 5 min.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'note',         'Ana esta muito interessada no plano anual. Voltar a contatar na sexta.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002',
   'call',         'Ligacao de 20 min. Carlos pediu proposta por escrito ate segunda-feira.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002',
   'email',        'Proposta enviada por e-mail com validade de 7 dias.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003',
   'sale',         'Venda fechada: Plano Mensal Premium - R$ 1.200,00 via PIX.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004',
   'whatsapp',     'Primeiro contato via WhatsApp. Cliente ainda avaliando opcoes.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000005',
   'stage_change', 'Movido de "Novo lead" para "Contato feito" apos reuniao inicial.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000006',
   'note',         'Fernando solicitou visita tecnica. Preferencia por manha.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000007',
   'email',        'E-mail de apresentacao enviado. Sem resposta ainda.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000008',
   'call',         'Thiago confirmou interesse. Aguardando aprovacao do gestor.');
