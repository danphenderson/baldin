=========================
Baldin Developer Preview
=========================

Baldin is a local-first, developer-preview workspace for exploring job-search
automation. The public repository is intended for local evaluation,
architecture exploration, and contribution rather than as a production
deployment blueprint.

.. note::

   The primary supported workflow today is local development via
   ``docker-compose.yml``. The AWS/CDK assets remain useful for experimentation,
   but they are not the default path for evaluating the project.

Quick Links
-----------

* `Repository overview and local quickstart <https://github.com/danphenderson/baldin/blob/main/README.md>`_
* `Backend details and data model <https://github.com/danphenderson/baldin/blob/main/backend/README.md>`_
* `Issue tracker <https://github.com/danphenderson/baldin/issues>`_

Local Services
--------------

When the local stack is running, the primary entry points are:

* Frontend: ``http://localhost:5173``
* API: ``http://localhost:8004``
* Swagger UI: ``http://localhost:8004/docs``
* ReDoc: ``http://localhost:8004/redoc``
* Admin: ``http://localhost:8004/admin``

API Reference
-------------

Main Application
~~~~~~~~~~~~~~~~

.. automodule:: app.main
   :members:
   :undoc-members:
   :show-inheritance:

Data Model
~~~~~~~~~~

.. automodule:: app.models
   :members:
   :undoc-members:
   :show-inheritance:

Schemas
~~~~~~~

.. automodule:: app.schemas
   :members:
   :undoc-members:
   :show-inheritance:

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
