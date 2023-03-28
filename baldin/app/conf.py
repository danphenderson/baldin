# app/config.py
import os
import logging
from pathlib import Path
from selenium.webdriver.chrome.options import Options as ChromeOptions
from pydantic import AnyUrl, BaseSettings

log = logging.getLogger("uvicorn")

class _Config:
    case_sensitive = False
    env_file = Path('.').parent.parent / ".env"
    env_file_encoding = "utf-8"


class _BaseSettings(BaseSettings):
    class Config(_Config):
        pass

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        log.info("Loaded settings from the environment.")

class Settings(_BaseSettings):
    environment : str
    database_url : AnyUrl
        

class Chrome(_BaseSettings, env_prefix="CHROME_"):
    """
    Configuration for a Google Chrome web driver.
    
    See https://pypi.org/project/selenium/, `ChromeOptions` for more information.
    """
    driver_path: str
    incognito_option: bool = True
    headless_option: bool = False

    @property
    def options(self) -> ChromeOptions:
        options = ChromeOptions()
        options.add_argument('--no-sandbox')
        #options.add_argument('--window-size=1420,1080')
        options.add_argument('--ignore-certificate-errors')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        if self.incognito_option:
            options.add_argument("--incognito")
        if self.headless_option:
            options.add_argument("--headless")
            options.add_argument("--dump-dom")
        return options


class OpenAI(_BaseSettings, env_prefix="OPENAI_"):
    """
    Configuration for OpenAI API.
    
    See https://openai.com/ for more information.
    """
    key: str = ""
    model: str = "gpt-3.5-turbo"


class Linkedin(_BaseSettings, env_prefix="LINKEDIN_"):
    """
    Configuration logging into LinkedIn.
    """
    username: str = ""
    password: str = ""

    search_endpoint: str = "https://www.linkedin.com/jobs/search/?currentJobId=3505387285&f_E=2%2C3%2C4&f_JT=F&keywords=Python%20FastAPI"
    profile_endpoint: str = "https://www.linkedin.com/in/daniel-henderson-6a9485bb/"
    login_endpoint: str = "https://www.linkedin.com/login"


class Glassdoor(_BaseSettings, env_prefix="GLASSDOOR_"):
    """
    Configuration logging into Glassdoor.
    """
    username: str = ""
    password: str = ""

def get_settings(**kwargs) -> BaseSettings:
    settings = Settings(**kwargs)
    log.info(f"Loaded settings from the environment: {settings}")
    return settings

def get_chrome_settings(**kwargs) -> Chrome:
    chrome = Chrome(**kwargs)
    log.info(f"Loaded Chrome settings from the environment: {chrome}")
    return chrome


def get_openai_settings(**kwargs) -> OpenAI:
    openai = OpenAI(**kwargs)
    log.info(f"Loaded OpenAI settings from the environment: {openai}")
    return openai


def get_linkedin_settings(**kwargs) -> Linkedin:
    linkedin = Linkedin(**kwargs)
    log.info(f"Loaded LinkedIn settings from the environment: {linkedin}")
    return linkedin


def get_glassdoor_settings(**kwargs) -> Glassdoor:
    glassdoor = Glassdoor(**kwargs)
    log.info(f"Loaded Glassdoor settings from the environment: {glassdoor}")
    return glassdoor
