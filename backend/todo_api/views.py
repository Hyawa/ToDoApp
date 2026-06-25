import random
import logging
from datetime import timedelta, datetime, time as dt_time
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Max

from .models import Tag, TaskList, Task, Subtask
from .serializers import TagSerializer, TaskListSerializer, TaskSerializer, SubtaskSerializer

logger = logging.getLogger(__name__)

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

class TaskListViewSet(viewsets.ModelViewSet):
    queryset = TaskList.objects.all()
    serializer_class = TaskListSerializer

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.all().order_by('position', '-created_at')
        
        list_id = self.request.query_params.get('list_id')
        if list_id is not None:
            queryset = queryset.filter(task_list_id=list_id)
            
        is_starred = self.request.query_params.get('is_starred')
        if is_starred is not None:
            queryset = queryset.filter(is_starred=is_starred.lower() == 'true')
        
        # TASKS_FROM_DATABASE
        tasks_data = list(queryset.values('id', 'title', 'start_date', 'due_date', 'scheduled_time', 'recurrence_type', 'repeat_monday', 'repeat_tuesday', 'repeat_wednesday', 'repeat_thursday', 'repeat_friday', 'repeat_saturday', 'repeat_sunday'))
        logger.info(f"TASKS_FROM_DATABASE", extra={"count": len(tasks_data), "tasks": tasks_data})
            
        return queryset

    def perform_create(self, serializer):
        # CREATE_REQUEST_RECEIVED
        logger.info(f"CREATE_REQUEST_RECEIVED", extra={
            "receivedDate": timezone.now().isoformat(),
            "body": self.request.data
        })
        
        # BEFORE_DB_SAVE
        validated_data = serializer.validated_data
        logger.info(f"BEFORE_DB_SAVE", extra={
            "title": validated_data.get('title'),
            "start_date": str(validated_data.get('start_date')),
            "due_date": str(validated_data.get('due_date')),
            "scheduled_time": str(validated_data.get('scheduled_time')),
            "recurrence_type": validated_data.get('recurrence_type'),
        })
        
        initial_position = random.uniform(1000, 9000)
        instance = serializer.save(position=initial_position)
        
        # AFTER_DB_SAVE
        logger.info(f"AFTER_DB_SAVE", extra={
            "task_id": instance.id,
            "title": instance.title,
            "savedDate": str(instance.start_date),
            "savedDueDate": str(instance.due_date),
        })
        
        logger.warning("TASK CRIADA", extra={"task_id": instance.id, "title": instance.title, "origin": "perform_create"})

    def perform_update(self, serializer):
        instance = serializer.instance
        was_completed = instance.is_completed
        # Log incoming update and current state
        logger.info(f"Updating Task id={instance.id} - payload={self.request.data} - was_completed={was_completed}")
        # Log validated data (if available)
        try:
            if hasattr(serializer, 'validated_data'):
                logger.info(f"Validated data: {serializer.validated_data}")
        except Exception:
            # ignore logging failure
            pass

        try:
            updated_instance = serializer.save()
            logger.info(f"Updated Task id={instance.id} - new_is_completed={updated_instance.is_completed} recurrence={updated_instance.recurrence_type}")
        except Exception as e:
            logger.exception(f"Failed to update Task id={instance.id}: {e}")
            raise

        # Double-check persisted value from DB
        try:
            fresh = Task.objects.get(id=instance.id)
            logger.info(f"DB state after update Task id={instance.id} is_completed={fresh.is_completed}")
        except Exception:
            logger.exception(f"Failed to fetch Task id={instance.id} after update")

        # Handle recurrence logic
        # NOTE: previously we created a new Task immediately upon completion.
        # That caused a duplicate to appear right after marking as complete.
        # New behavior (minimal change): record last_occurrence and schedule next_occurrence
        # but DO NOT create a new Task right away. The next occurrence should be
        # materialized only when the next date arrives (or by a scheduled job).
        if not was_completed and updated_instance.is_completed and updated_instance.recurrence_type != 'NONE':
            logger.info(f"Scheduling next occurrence for Task id={updated_instance.id} recurrence={updated_instance.recurrence_type}")
            # Determine next start_date
            next_start_date = updated_instance.start_date

            if updated_instance.recurrence_type == 'DAILY':
                next_start_date += timedelta(days=1)
            elif updated_instance.recurrence_type == 'WEEKLY':
                next_start_date += timedelta(days=7)
            elif updated_instance.recurrence_type == 'MONTHLY':
                month = next_start_date.month % 12 + 1
                year = next_start_date.year + (next_start_date.month // 12)
                try:
                    next_start_date = next_start_date.replace(year=year, month=month)
                except ValueError:
                    next_start_date = next_start_date.replace(year=year, month=month, day=28)
            elif updated_instance.recurrence_type == 'YEARLY':
                try:
                    next_start_date = next_start_date.replace(year=next_start_date.year + 1)
                except ValueError:
                    next_start_date = next_start_date.replace(year=next_start_date.year + 1, day=28)
            elif updated_instance.recurrence_type == 'CUSTOM':
                days_map = {
                    0: updated_instance.repeat_monday,
                    1: updated_instance.repeat_tuesday,
                    2: updated_instance.repeat_wednesday,
                    3: updated_instance.repeat_thursday,
                    4: updated_instance.repeat_friday,
                    5: updated_instance.repeat_saturday,
                    6: updated_instance.repeat_sunday
                }
                for i in range(1, 8):
                    potential_date = updated_instance.start_date + timedelta(days=i)
                    if days_map.get(potential_date.weekday()):
                        next_start_date = potential_date
                        break
                else:
                    next_start_date += timedelta(days=7)

            # record last occurrence and schedule next_occurrence datetime
            try:
                updated_instance.last_occurrence = timezone.now()
                # build datetime for next occurrence using scheduled_time if available
                scheduled = updated_instance.scheduled_time
                if scheduled:
                    naive_dt = datetime.combine(next_start_date, scheduled)
                else:
                    naive_dt = datetime.combine(next_start_date, dt_time(0, 0))
                # make timezone-aware
                next_dt = timezone.make_aware(naive_dt) if timezone.is_naive(naive_dt) else naive_dt
                updated_instance.next_occurrence = next_dt
                updated_instance.save()
                logger.info(f"Scheduled next_occurrence for Task id={updated_instance.id}: {updated_instance.next_occurrence}")
            except Exception:
                logger.exception(f"Failed to schedule next occurrence for Task id={updated_instance.id}")

    def _create_recurring_task(self, task):
        # Determine next start_date
        next_start_date = task.start_date
        
        if task.recurrence_type == 'DAILY':
            next_start_date += timedelta(days=1)
        elif task.recurrence_type == 'WEEKLY':
            next_start_date += timedelta(days=7)
        elif task.recurrence_type == 'MONTHLY':
            month = next_start_date.month % 12 + 1
            year = next_start_date.year + (next_start_date.month // 12)
            try:
                next_start_date = next_start_date.replace(year=year, month=month)
            except ValueError:
                next_start_date = next_start_date.replace(year=year, month=month, day=28)
        elif task.recurrence_type == 'YEARLY':
            try:
                next_start_date = next_start_date.replace(year=next_start_date.year + 1)
            except ValueError:
                next_start_date = next_start_date.replace(year=next_start_date.year + 1, day=28)
        elif task.recurrence_type == 'CUSTOM':
            days_map = {
                0: task.repeat_monday,
                1: task.repeat_tuesday,
                2: task.repeat_wednesday,
                3: task.repeat_thursday,
                4: task.repeat_friday,
                5: task.repeat_saturday,
                6: task.repeat_sunday
            }
            for i in range(1, 8):
                potential_date = task.start_date + timedelta(days=i)
                if days_map.get(potential_date.weekday()):
                    next_start_date = potential_date
                    break
            else:
                next_start_date += timedelta(days=7)
        
        # Clone task (recurrence) - instrument creation
        before_count = Task.objects.count()
        logger.info(f"About to create recurring task for Task id={task.id}. Task.count before={before_count}")
        new_task = Task.objects.create(
            title=task.title,
            description=task.description,
            task_list=task.task_list,
            is_completed=False,
            is_starred=task.is_starred,
            position=random.uniform(1000, 9000),
            
            start_date=next_start_date,
            due_date=next_start_date,
            scheduled_time=task.scheduled_time,
            recurrence_type=task.recurrence_type,
            
            repeat_monday=task.repeat_monday,
            repeat_tuesday=task.repeat_tuesday,
            repeat_wednesday=task.repeat_wednesday,
            repeat_thursday=task.repeat_thursday,
            repeat_friday=task.repeat_friday,
            repeat_saturday=task.repeat_saturday,
            repeat_sunday=task.repeat_sunday,
            
            notification_offset=task.notification_offset,
            hide_until_due=task.hide_until_due,
        )
        new_task.tags.set(task.tags.all())
        after_count = Task.objects.count()
        logger.warning("TASK CRIADA", extra={"task_id": new_task.id, "title": new_task.title, "origin": "_create_recurring_task"})
        # Log stack trace for origin
        import traceback, sys
        st = ''.join(traceback.format_stack(limit=10))
        logger.info(f"Stack creating recurring task:\n{st}")
        if after_count > before_count:
            logger.error(f"ALERTA: nova tarefa criada apos conclusao original id={task.id}. count before={before_count} after={after_count}")

        # Clone subtasks
        for subtask in task.subtasks.all():
            Subtask.objects.create(
                task=new_task,
                title=subtask.title,
                is_completed=False,
                position=subtask.position
            )

    def update(self, request, *args, **kwargs):
        # Log incoming update payload for observability
        pk = kwargs.get('pk')
        logger.info(f"Received update request for Task pk={pk} payload={request.data}")
        before_count = Task.objects.count()
        response = super().update(request, *args, **kwargs)
        after_count = Task.objects.count()
        logger.info(f"Update response status={getattr(response, 'status_code', None)} data={getattr(response, 'data', None)}")
        logger.info(f"Task count before={before_count} after={after_count}")
        if after_count > before_count:
            logger.error(f"ALERTA: nova tarefa criada durante update de task pk={pk}")
        return response

    @action(detail=True, methods=['patch'])
    def reorder(self, request, pk=None):
        task = self.get_object()
        new_position = request.data.get('position')
        logger.info(f"Reorder request for Task id={task.id} payload={request.data}")
        if new_position is not None:
            task.position = float(new_position)
            task.save()
            return Response({'status': 'reordered'})
        return Response({'error': 'position is required'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='send-to-bottom')
    def send_to_bottom(self, request, pk=None):
        task = self.get_object()
        max_position = Task.objects.aggregate(Max('position'))['position__max'] or 0.0
        task.position = max_position + 1000.0
        task.save()
        return Response({'status': 'sent to bottom', 'new_position': task.position})

class SubtaskViewSet(viewsets.ModelViewSet):
    queryset = Subtask.objects.all()
    serializer_class = SubtaskSerializer

    def perform_create(self, serializer):
        task_id = self.request.data.get('task')
        if not task_id:
            # Let DRF handle validation; keep behavior non-breaking
            return serializer.save()
        task = Task.objects.get(id=task_id)
        # place new subtask at the end for that task
        existing_max = Subtask.objects.filter(task=task).aggregate(Max('position'))['position__max'] or 0.0
        serializer.save(task=task, position=existing_max + 1000.0)


from rest_framework.decorators import api_view


@api_view(['GET'])
def debug_task(request, id):
    """Temporary debug endpoint returning task metadata for diagnosis"""
    try:
        t = Task.objects.get(id=id)
        data = {
            'id': t.id,
            'title': t.title,
            'is_completed': t.is_completed,
            'recurrence_type': t.recurrence_type,
            'created_at': t.created_at,
            'updated_at': t.updated_at,
            'last_occurrence': t.last_occurrence,
            'next_occurrence': t.next_occurrence,
        }
        return Response(data)
    except Task.DoesNotExist:
        return Response({'error': 'not found'}, status=404)
