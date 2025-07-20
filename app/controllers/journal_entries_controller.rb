class JournalEntriesController < ApplicationController
  before_action :set_journal_entry, only: [ :show, :update, :destroy ]

  # GET /journal_entries
  def index
    journal_entries = current_user.journal_entries.order(:date)
    render json: journal_entries
  end

  # GET /journal_entries/1
  def show
    render json: @journal_entry
  end

  # POST /journal_entries
  def create
    journal_entry = current_user.journal_entries.build(journal_entry_params)
    if journal_entry.save
      render json: journal_entry, status: :created
    else
      render json: journal_entry.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /journal_entries/1
  def update
    # If content is empty, delete the entry instead of updating
    if journal_entry_params[:content].blank?
      @journal_entry.destroy
      head :no_content
    else
      if @journal_entry.update(journal_entry_params)
        render json: @journal_entry
      else
        render json: @journal_entry.errors, status: :unprocessable_entity
      end
    end
  end

  # DELETE /journal_entries/1
  def destroy
    @journal_entry.destroy
    head :no_content
  end

  private
    def set_journal_entry
      @journal_entry = current_user.journal_entries.find(params[:id])
    end

    def journal_entry_params
      params.require(:journal_entry).permit(:date, :content)
    end
end
