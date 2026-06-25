/**
 * Verifica se uma tarefa deve ser exibida agora, considerando:
 * - Data e horário agendado (`start_date` + `scheduled_time`).
 * - Recorrência (`recurrence_type` e dias da semana).
 * - `hide_until_due` (tempo antes do horário agendado para exibir a tarefa).
 *
 * @param task - A tarefa a ser verificada.
 * @param referenceDate - Data de referência para verificação (padrão: data atual).
 * @returns Um objeto com `visible` (boolean) e `reason` (string) para depuração.
 */
export function isTaskVisible(
  task: {
    id: number;
    title: string;
    is_completed: boolean;
    scheduled_time?: string | null;
    hide_until_due?: number | null;
    recurrence_type?: string | null;
    repeat_monday?: boolean;
    repeat_tuesday?: boolean;
    repeat_wednesday?: boolean;
    repeat_thursday?: boolean;
    repeat_friday?: boolean;
    repeat_saturday?: boolean;
    repeat_sunday?: boolean;
    start_date: string;
  },
  referenceDate: Date = new Date()
): { visible: boolean; reason: string } {
  const todayWeekday = referenceDate.getDay(); // 0 (Domingo) a 6 (Sábado)
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // 1. Tarefa concluída?
  if (task.is_completed) {
    return { visible: false, reason: "Tarefa concluída" };
  }

  // 2. Hoje é um dia válido da recorrência?
  if (task.recurrence_type === 'CUSTOM') {
    const allowedWeekdays = [
      task.repeat_sunday,    // 0
      task.repeat_monday,    // 1
      task.repeat_tuesday,   // 2
      task.repeat_wednesday, // 3
      task.repeat_thursday,  // 4
      task.repeat_friday,    // 5
      task.repeat_saturday,  // 6
    ];

    if (!allowedWeekdays[todayWeekday]) {
      return {
        visible: false, 
        reason: `Hoje (${weekdays[todayWeekday]}) não é um dia de recorrência. Dias permitidos: ${allowedWeekdays.map((allowed, idx) => allowed ? weekdays[idx] : null).filter(Boolean).join(', ')}`
      };
    }
  } else if (task.recurrence_type === 'NONE') {
    // 3. Data de referência é igual à start_date? (apenas para tarefas sem recorrência)
    // Parse date as local date to avoid timezone issues (YYYY-MM-DD string)
    const [year, month, day] = task.start_date.split('-').map(Number);
    const taskStartDate = new Date(year, month - 1, day);
    if (
      referenceDate.getFullYear() !== taskStartDate.getFullYear() ||
      referenceDate.getMonth() !== taskStartDate.getMonth() ||
      referenceDate.getDate() !== taskStartDate.getDate()
    ) {
      return { visible: false, reason: `Data agendada (${taskStartDate.toLocaleDateString()}) não é hoje` };
    }
  }

  // 4. Já chegou o momento definido em "Mostrar Tarefa"?
  if (task.scheduled_time && task.hide_until_due !== null && task.hide_until_due !== undefined) {
    const [hours, minutes] = task.scheduled_time.split(':').map(Number);
    const [year, month, day] = task.start_date.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

    const showTime = new Date(scheduledDate.getTime() - task.hide_until_due * 60000);
    if (referenceDate < showTime) {
      return { visible: false, reason: `Horário hide_until_due (${showTime.toLocaleTimeString()}) não atingido` };
    }
  }

  return { visible: true, reason: "Todos os critérios de visibilidade atendidos" };
}