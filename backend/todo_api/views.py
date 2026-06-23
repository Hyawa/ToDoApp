import random
from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Max

from .models import Tag, Task, Subtask
from .serializers import TagSerializer, TaskSerializer, SubtaskSerializer

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('position', '-created_at')
    serializer_class = TaskSerializer

    def perform_create(self, serializer):
        # Set a random initial position for daily shuffling effect for new tasks
        initial_position = random.uniform(1000, 9000)
        serializer.save(position=initial_position)

    def perform_update(self, serializer):
        instance = serializer.instance
        was_completed = instance.is_completed
        updated_instance = serializer.save()

        # Handle recurrence logic
        if not was_completed and updated_instance.is_completed and updated_instance.recurrence_type != 'NONE':
            self._create_recurring_task(updated_instance)

    def _create_recurring_task(self, task):
        # Determine next due date
        next_due_date = task.due_date
        if task.recurrence_type == 'DAILY':
            next_due_date += timedelta(days=1)
        elif task.recurrence_type == 'WEEKLY':
            next_due_date += timedelta(days=7)
        elif task.recurrence_type == 'MONTHLY':
            # Simple 30-day approximation for MVP
            next_due_date += timedelta(days=30)
        
        # Clone task
        new_task = Task.objects.create(
            title=task.title,
            description=task.description,
            is_completed=False,
            due_date=next_due_date,
            position=random.uniform(1000, 9000),
            recurrence_type=task.recurrence_type
        )
        new_task.tags.set(task.tags.all())

        # Clone subtasks
        for subtask in task.subtasks.all():
            Subtask.objects.create(
                task=new_task,
                title=subtask.title,
                is_completed=False,
                position=subtask.position
            )

    @action(detail=True, methods=['patch'])
    def reorder(self, request, pk=None):
        task = self.get_object()
        new_position = request.data.get('position')
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
        task = Task.objects.get(id=task_id)
        serializer.save(task=task)
