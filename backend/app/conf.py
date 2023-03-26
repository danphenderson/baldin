# project/app/config.py
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
    driver_path: str = "/opt/homebrew/bin/chromedriver"
    headless_option: bool = False
    incognito_option: bool = True
    dump_dom_option: bool = False
    disable_gpu_option: bool = False

    @property
    def options(self) -> ChromeOptions:
        options = ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--ignore-certificate-errors')
        options.add_argument('--disable-dev-shm-usage')
        if self.incognito_option:
            options.add_argument("--incognito")
        if self.headless_option:
            options.add_argument("--headless")
        if self.disable_gpu_option:
            options.add_argument("--disable-gpu") # set to true for Windows OS
        if self.dump_dom_option:
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
    log.info("Loading config settings from the environment...")
    return Settings(**kwargs)

def get_chrome_settings(**kwargs) -> Chrome:
    log.info("Loading Chrome settings from the environment...")
    return Chrome(**kwargs)


def get_openai_settings(**kwargs) -> OpenAI:
    log.info("Loading OpenAI settings from the environment...")
    return OpenAI(**kwargs)


def get_linkedin_settings(**kwargs) -> Linkedin:
    log.info("Loading LinkedIn settings from the environment...")
    return Linkedin(**kwargs)

def get_glassdoor_settings(**kwargs) -> Glassdoor:
    log.info("Loading Glassdoor settings from the environment...")
    return Glassdoor(**kwargs)
   
