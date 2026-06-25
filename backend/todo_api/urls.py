from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TagViewSet, TaskViewSet, SubtaskViewSet, TaskListViewSet
from .views import debug_task

router = DefaultRouter()
router.register(r'tags', TagViewSet)
router.register(r'tasklists', TaskListViewSet)
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'subtasks', SubtaskViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('debug/task/<int:id>/', debug_task),
]
