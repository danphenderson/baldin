import pytest
from employment_automation.models.base import BaseModel


class SampleModel(BaseModel):
    name: str = 'John Doe'
    age: int = 25


@pytest.mark.asyncio
async def test_async_base_model_to_dict():
    async with SampleModel() as model:
        expected_dict = {'name': 'John Doe', 'age': 25}
        expected_json = '{\n    "name": "John Doe",\n    "age": 25\n}'
        assert await model.to_dict() == expected_dict
        assert await model.to_json() == expected_json


@pytest.mark.asyncio
async def test_async_base_model_run_async():
    async with SampleModel() as model:
        result = await model.run_async(model.to_dict)
        assert await result == {'name': 'John Doe', 'age': 25}
        async def mock_async_function():
            await model.wait(1)
            return 10
        result = await model.run_async(mock_async_function)
        assert await result == 10

@pytest.mark.asyncio
async def test_async_base_model_wait():
    async with SampleModel() as model:
        import time
        start_time = time.time()
        await model.wait(1)
        end_time = time.time()
        assert (end_time - start_time) >= 1

@pytest.mark.asyncio
async def test_async_base_model_async_with():
    class SampleModel2(BaseModel):
        name: str
        age: int

        async def __aenter__(self):
            self.name = 'John Doe'
            self.age = 25
            return self

        async def __aexit__(self, exc_type, exc_value, traceback):
            pass

    async with SampleModel2(name='name', age=1) as model: # type: ignore
        assert model.name == 'John Doe'
        assert model.age == 25

@pytest.mark.asyncio
async def test_async_base_model_await():
    async with BaseModel() as model:
        assert model is not None
        assert isinstance(model, BaseModel)
