import { deveExibirAgora } from './taskVisibility';

describe('deveExibirAgora', () => {
  const now = new Date();
  const today = now.getDay(); // 0 (Domingo) a 6 (Sábado)
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  // Função auxiliar para formatar data como YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Função auxiliar para gerar horário no formato HH:MM
  const formatTime = (hours: number, minutes: number) => `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // 1. Tarefa sem repetição e sem `hide_until_due`
  describe('Tarefa sem repetição e sem `hide_until_due`', () => {
    it('deve retornar `true` se não estiver concluída e a data de início for hoje ou no passado', () => {
      const task = {
        is_completed: false,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(true);
    });

    it('deve retornar `false` se estiver concluída', () => {
      const task = {
        is_completed: true,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });
  });

  // 2. Tarefa com repetição semanal (ex: apenas Domingo)
  describe('Tarefa com repetição semanal', () => {
    const recurrenceDays = [0]; // Domingo

    it('deve retornar `true` se hoje for o dia correto e não estiver concluída', () => {
      const task = {
        is_completed: false,
        recurrence_type: 'weekly',
        recurrence_days: today === 0 ? recurrenceDays : [today], // Garantir que hoje é um dia válido
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(true);
    });

    it('deve retornar `false` se hoje não for o dia correto', () => {
      const invalidDay = today === 0 ? 1 : 0; // Se hoje for Domingo, usar Segunda
      const task = {
        is_completed: false,
        recurrence_type: 'weekly',
        recurrence_days: [invalidDay],
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });

    it('deve retornar `false` se estiver concluída, independentemente do dia', () => {
      const task = {
        is_completed: true,
        recurrence_type: 'weekly',
        recurrence_days: recurrenceDays,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });
  });

  // 3. Tarefa com `hide_until_due` (ex: 1 hora antes)
  describe('Tarefa com `hide_until_due`', () => {
    const hideUntilDue = 60; // 1 hora em minutos
    const scheduledTime = formatTime(now.getHours(), now.getMinutes());

    it('deve retornar `false` se ainda não chegou o horário configurado', () => {
      const futureTime = new Date(now.getTime() + (hideUntilDue * 60000)); // 1 hora no futuro
      const task = {
        is_completed: false,
        scheduled_time: formatTime(futureTime.getHours(), futureTime.getMinutes()),
        hide_until_due: hideUntilDue,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });

    it('deve retornar `true` se o horário configurado foi atingido', () => {
      const pastTime = new Date(now.getTime() - (hideUntilDue * 60000)); // 1 hora no passado
      const task = {
        is_completed: false,
        scheduled_time: formatTime(pastTime.getHours(), pastTime.getMinutes()),
        hide_until_due: hideUntilDue,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(true);
    });

    it('deve retornar `false` se estiver concluída, independentemente do horário', () => {
      const task = {
        is_completed: true,
        scheduled_time: scheduledTime,
        hide_until_due: hideUntilDue,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });
  });

  // 4. Tarefa com repetição e `hide_until_due`
  describe('Tarefa com repetição e `hide_until_due`', () => {
    const recurrenceDays = [0]; // Domingo
    const hideUntilDue = 60; // 1 hora em minutos
    const scheduledTime = formatTime(now.getHours(), now.getMinutes());

    it('deve retornar `false` se hoje não for o dia correto', () => {
      const invalidDay = today === 0 ? 1 : 0; // Se hoje for Domingo, usar Segunda
      const task = {
        is_completed: false,
        recurrence_type: 'weekly',
        recurrence_days: [invalidDay],
        scheduled_time: scheduledTime,
        hide_until_due: hideUntilDue,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });

    it('deve retornar `false` se hoje for o dia correto, mas o horário não foi atingido', () => {
      const futureTime = new Date(now.getTime() + (hideUntilDue * 60000)); // 1 hora no futuro
      const task = {
        is_completed: false,
        recurrence_type: 'weekly',
        recurrence_days: today === 0 ? recurrenceDays : [today], // Garantir que hoje é um dia válido
        scheduled_time: formatTime(futureTime.getHours(), futureTime.getMinutes()),
        hide_until_due: hideUntilDue,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });

    it('deve retornar `true` se hoje for o dia correto e o horário foi atingido', () => {
      const pastTime = new Date(now.getTime() - (hideUntilDue * 60000)); // 1 hora no passado
      const task = {
        is_completed: false,
        recurrence_type: 'weekly',
        recurrence_days: today === 0 ? recurrenceDays : [today], // Garantir que hoje é um dia válido
        scheduled_time: formatTime(pastTime.getHours(), pastTime.getMinutes()),
        hide_until_due: hideUntilDue,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(true);
    });

    it('deve retornar `false` se estiver concluída, independentemente do dia ou horário', () => {
      const task = {
        is_completed: true,
        recurrence_type: 'weekly',
        recurrence_days: recurrenceDays,
        scheduled_time: scheduledTime,
        hide_until_due: hideUntilDue,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(false);
    });
  });

  // 5. Tarefa sem `scheduled_time`
  describe('Tarefa sem `scheduled_time`', () => {
    it('deve retornar `true` se não estiver concluída', () => {
      const task = {
        is_completed: false,
        start_date: formatDate(now),
      };
      expect(deveExibirAgora(task)).toBe(true);
    });
  });

  // 6. Tarefa com data de início no passado ou futuro (não validado na função atual)
  describe('Tarefa com data de início', () => {
    it('deve retornar `true` se não estiver concluída, independentemente da `start_date`', () => {
      const task = {
        is_completed: false,
        start_date: formatDate(tomorrow), // Data no futuro
      };
      expect(deveExibirAgora(task)).toBe(true);
    });
  });
});